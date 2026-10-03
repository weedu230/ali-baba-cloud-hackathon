import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";

type DeliveryMode = "DIRECT" | "SHARED";
type CustomerType = "INDIVIDUAL" | "BUSINESS";

type VehicleClass =
  | "BIKE"
  | "LOADING_RICKSHAW"
  | "LTV"
  | "HTV";

type ShipmentInput = {
  goodsType: string;
  weight: number;
  description: string;

  pickup: string;
  destination: string;

  deliveryMode: DeliveryMode;
  customerType: CustomerType;

  companyName?: string;
  businessType?: string;
};

type Provider = {
  id: number;
  rider: string;

  rating: number;

  vehicleName: string;
  vehicleClass: VehicleClass;

  maxLoadKg: number;

  eta: number;
  distanceAway: number;

  sharedSupported: boolean;

  priceBias: number;
};

type RequestBody = {
  shipment: ShipmentInput;

  routeCost: number;
  routeMinutes: number;

  compatibleSharedLoads: number;

  providers: Provider[];
};

/* ============================================================
   VEHICLE LOGIC
   ============================================================ */

function determineVehicleClass(
  shipment: ShipmentInput
): VehicleClass {
  const text =
    `${shipment.goodsType} ${shipment.description}`.toLowerCase();

  const fragile =
    text.includes("fragile") ||
    text.includes("glass") ||
    text.includes("monitor") ||
    text.includes("electronics") ||
    text.includes("electronic");

  if (shipment.weight <= 15 && !fragile) {
    return "BIKE";
  }

  if (shipment.weight <= 250 && !fragile) {
    return "LOADING_RICKSHAW";
  }

  if (shipment.weight <= 1000) {
    return "LTV";
  }

  return "HTV";
}

function vehicleName(
  type: VehicleClass
) {
  switch (type) {
    case "BIKE":
      return "Motorbike";

    case "LOADING_RICKSHAW":
      return "Loading Rickshaw";

    case "LTV":
      return "Light Transport Vehicle";

    case "HTV":
      return "Heavy Transport Vehicle";
  }
}

/* ============================================================
   ONE PRICING SOURCE OF TRUTH

   Market range + provider quotes are generated from the
   exact same pricing model.
   ============================================================ */

function calculateMarketRange(
  shipment: ShipmentInput,
  routeCost: number
) {
  let base =
    250 +
    routeCost * 42 +
    shipment.weight * 10;

  if (
    shipment.customerType === "BUSINESS"
  ) {
    /*
      Demo contract-volume adjustment.
    */
    base *= 0.95;
  }

  if (
    shipment.deliveryMode === "SHARED"
  ) {
    /*
      Smart load sharing discount.
    */
    base *= 0.72;
  }

  const minimum =
    Math.max(
      280,
      Math.round(base)
    );

  const maximum =
    Math.round(
      minimum * 1.23
    );

  return {
    minimum,
    maximum,
  };
}

function generateQuotes(
  providers: Provider[],
  shipment: ShipmentInput,
  minimum: number,
  maximum: number,
  recommendedClass: VehicleClass
) {
  const midpoint =
    (minimum + maximum) / 2;

  return providers.map(
    (provider) => {
      let quote =
        midpoint *
        (1 + provider.priceBias);

      /*
        Vehicle efficiency.
      */

      if (
        provider.vehicleClass ===
        recommendedClass
      ) {
        quote *= 0.97;
      }

      /*
        Heavy trucks naturally cost more.
      */

      if (
        provider.vehicleClass === "HTV"
      ) {
        quote *= 1.14;
      }

      /*
        Shared capable fleet can use
        capacity more efficiently.
      */

      if (
        shipment.deliveryMode === "SHARED" &&
        provider.sharedSupported
      ) {
        quote *= 0.97;
      }

      /*
        Keep quotes coherent with the
        estimated market range.
      */

      const lowerBoundary =
        minimum * 0.88;

      const upperBoundary =
        maximum * 1.15;

      quote =
        Math.max(
          lowerBoundary,
          Math.min(
            quote,
            upperBoundary
          )
        );

      return {
        ...provider,
        quote: Math.round(quote),
      };
    }
  );
}

/* ============================================================
   LOCAL INTELLIGENCE

   This guarantees the demo still returns professional,
   deterministic logistics analysis even if the external
   intelligence endpoint is unavailable.
   ============================================================ */

function buildLocalIntelligence(
  body: RequestBody
) {
  const {
    shipment,
    routeCost,
    routeMinutes,
    compatibleSharedLoads,
    providers,
  } = body;

  const text =
    `${shipment.goodsType} ${shipment.description}`.toLowerCase();

  const fragile =
    text.includes("fragile") ||
    text.includes("glass") ||
    text.includes("monitor") ||
    text.includes("electronic");

  const food =
    text.includes("food") ||
    text.includes("cake") ||
    text.includes("fruit");

  const recommendedClass =
    determineVehicleClass(
      shipment
    );

  const market =
    calculateMarketRange(
      shipment,
      routeCost
    );

  const quotes =
    generateQuotes(
      providers,
      shipment,
      market.minimum,
      market.maximum,
      recommendedClass
    );

  const additionalDelay =
    shipment.deliveryMode === "SHARED"
      ? Math.max(
          2,
          Math.round(
            routeMinutes * 0.08
          )
        )
      : 0;

  /*
    Local provider scoring.

    Gemini can improve/replace the
    recommendation below, but price
    itself is never hallucinated by AI.
  */

  const ranked =
    quotes
      .map((provider) => {
        let score = 0;

        score +=
          provider.rating * 20;

        score -=
          provider.distanceAway * 3;

        score -=
          provider.eta * 1.5;

        score -=
          provider.quote / 120;

        if (
          provider.vehicleClass ===
          recommendedClass
        ) {
          score += 28;
        }

        if (
          shipment.deliveryMode ===
            "SHARED" &&
          provider.sharedSupported
        ) {
          score += 15;
        }

        return {
          ...provider,
          score,
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score
      );

  const winner =
    ranked[0] ?? null;

  return {
    analysis: {
      category:
        shipment.goodsType,

      fragility:
        fragile
          ? "HIGH"
          : "MEDIUM",

      riskLevel:
        fragile || food
          ? "HIGH"
          : "MEDIUM",

      recommendedVehicleClass:
        recommendedClass,

      recommendedVehicle:
        vehicleName(
          recommendedClass
        ),

      estimatedFareMin:
        market.minimum,

      estimatedFareMax:
        market.maximum,

      estimatedDeliveryMinutes:
        routeMinutes +
        additionalDelay,

      handlingInstructions: [
        fragile
          ? "Keep the shipment upright and protected against impact."
          : "Secure the shipment before transportation.",

        "Confirm the physical condition of the goods during pickup.",

        shipment.deliveryMode === "SHARED"
          ? "Label and isolate the shipment from other shared loads."
          : "Maintain dedicated shipment handling throughout transportation.",
      ],

      compatibleSharedLoads,

      summary:
        shipment.deliveryMode === "SHARED"
          ? "The shipment can use smart load sharing when route-compatible capacity is available, reducing cost while keeping additional delay small."
          : "Direct delivery uses dedicated vehicle capacity and prioritizes minimum practical delivery delay.",
    },

    quotes,

    recommendation:
      winner
        ? {
            providerId:
              winner.id,

            provider:
              winner.rider,

            confidence: 90,

            reason:
              `${winner.rider} provides a strong balance of vehicle suitability, available capacity, provider rating, pickup distance, ETA and quoted price.`,

            factors: [
              `${winner.vehicleName} supports up to ${winner.maxLoadKg} kg`,
              `${winner.rating}/5 service rating`,
              `${winner.distanceAway} km from pickup`,
            ],
          }
        : null,
  };
}

/* ============================================================
   GEMINI

   AI evaluates shipment characteristics and provider selection.
   Pricing stays deterministic.
   ============================================================ */

async function askGemini(
  body: RequestBody,
  localResult: ReturnType<
    typeof buildLocalIntelligence
  >
) {
  const apiKey =
    process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return localResult;
  }

  const ai =
    new GoogleGenAI({
      apiKey,
    });

  const prompt = `
You are TransitGo AI, a logistics intelligence engine.

Analyze a goods shipment and select the best transport provider.

IMPORTANT:
- Provider prices have already been calculated by TransitGo.
- NEVER invent, modify or replace provider quotes.
- Select a provider using logistics suitability, not simply lowest price.
- Never recommend a vehicle below the shipment's required capacity.
- Direct delivery prioritizes dedicated movement and lower delay.
- Shared logistics prioritizes compatible capacity utilization while keeping detours small.
- Business shipments should consider commercial suitability and reliability.

SHIPMENT:
${JSON.stringify(
  body.shipment,
  null,
  2
)}

ROUTE INFORMATION:
Route cost: ${body.routeCost}
Approximate route time: ${body.routeMinutes} minutes
Compatible shared loads: ${body.compatibleSharedLoads}

CURRENT ANALYSIS:
${JSON.stringify(
  localResult.analysis,
  null,
  2
)}

AVAILABLE QUOTES:
${JSON.stringify(
  localResult.quotes,
  null,
  2
)}

Return:
- refined category
- fragility
- risk level
- recommended vehicle class
- recommended vehicle description
- handling instructions
- short shipment summary
- best provider ID/name
- recommendation confidence
- recommendation reason
- key recommendation factors

Do NOT return prices because pricing is controlled by TransitGo.
`;

  try {
    const response =
      await ai.models.generateContent({
        model:
          "gemini-3.5-flash-lite",

        contents: prompt,

        config: {
          temperature: 0.1,

          responseMimeType:
            "application/json",

          responseSchema: {
            type: Type.OBJECT,

            properties: {
              category: {
                type: Type.STRING,
              },

              fragility: {
                type: Type.STRING,
              },

              riskLevel: {
                type: Type.STRING,
              },

              recommendedVehicleClass:
                {
                  type:
                    Type.STRING,
                },

              recommendedVehicle:
                {
                  type:
                    Type.STRING,
                },

              handlingInstructions:
                {
                  type:
                    Type.ARRAY,

                  items: {
                    type:
                      Type.STRING,
                  },
                },

              summary: {
                type: Type.STRING,
              },

              providerId: {
                type: Type.NUMBER,
              },

              provider: {
                type: Type.STRING,
              },

              confidence: {
                type: Type.NUMBER,
              },

              reason: {
                type: Type.STRING,
              },

              factors: {
                type:
                  Type.ARRAY,

                items: {
                  type:
                    Type.STRING,
                },
              },
            },

            required: [
              "category",
              "fragility",
              "riskLevel",
              "recommendedVehicleClass",
              "recommendedVehicle",
              "handlingInstructions",
              "summary",
              "providerId",
              "provider",
              "confidence",
              "reason",
              "factors",
            ],
          },
        },
      });

    if (!response.text) {
      return localResult;
    }

    const intelligence =
      JSON.parse(
        response.text
      );

    /*
      IMPORTANT:

      AI can refine analysis and selection,
      but fare range + provider quotes remain
      our deterministic values.
    */

    return {
      analysis: {
        ...localResult.analysis,

        category:
          intelligence.category,

        fragility:
          intelligence.fragility,

        riskLevel:
          intelligence.riskLevel,

        recommendedVehicleClass:
          intelligence.recommendedVehicleClass,

        recommendedVehicle:
          intelligence.recommendedVehicle,

        handlingInstructions:
          intelligence.handlingInstructions,

        summary:
          intelligence.summary,
      },

      quotes:
        localResult.quotes,

      recommendation: {
        providerId:
          intelligence.providerId,

        provider:
          intelligence.provider,

        confidence:
          intelligence.confidence,

        reason:
          intelligence.reason,

        factors:
          intelligence.factors,
      },
    };
  } catch (error) {
    console.error(
      "TransitGo AI:",
      error
    );

    /*
      Keep the exact same response contract.
      The UI does not need to know which
      analysis path produced the result.
    */

    return localResult;
  }
}

/* ============================================================
   API
   ============================================================ */

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as RequestBody;

    const localResult =
      buildLocalIntelligence(
        body
      );

    const finalResult =
      await askGemini(
        body,
        localResult
      );

    return NextResponse.json(
      finalResult
    );
  } catch (error) {
    console.error(
      "TransitGo API:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to prepare shipment intelligence.",
      },
      {
        status: 500,
      }
    );
  }
}
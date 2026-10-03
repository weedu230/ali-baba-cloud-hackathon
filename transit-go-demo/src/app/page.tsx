"use client";

import dynamic from "next/dynamic";

import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowRight,
  BrainCircuit,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  ImagePlus,
  LogOut,
  MapPin,
  Navigation,
  Package,
  PackageCheck,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  UserRound,
  Wallet,
  Zap,
} from "lucide-react";

import "leaflet/dist/leaflet.css";

/* ============================================================
   TYPES
   ============================================================ */

type UserRole =
  | "CUSTOMER"
  | "PROVIDER";

type DemoUser = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type CustomerType =
  | "INDIVIDUAL"
  | "BUSINESS";

type DeliveryMode =
  | "DIRECT"
  | "SHARED";

type VehicleClass =
  | "BIKE"
  | "LOADING_RICKSHAW"
  | "LTV"
  | "HTV";

type Graph = Record<
  string,
  Record<string, number>
>;

type LocationInfo = {
  name: string;

  coordinates: [
    number,
    number
  ];
};

type PathResult = {
  path: string[];
  distance: number;
};

type Edge = {
  from: string;
  to: string;
  weight: number;
};

type MSTResult = {
  edges: Edge[];
  totalWeight: number;
};

type Provider = {
  id: number;
  rider: string;
  rating: number;

  vehicleName: string;
  vehicleClass:
    VehicleClass;

  maxLoadKg: number;

  eta: number;
  distanceAway: number;

  sharedSupported:
    boolean;

  priceBias: number;
};

type ProviderQuote =
  Provider & {
    quote: number;
  };

type SmartAnalysis = {
  category: string;
  fragility: string;
  riskLevel: string;

  recommendedVehicleClass:
    VehicleClass;

  recommendedVehicle:
    string;

  estimatedFareMin:
    number;

  estimatedFareMax:
    number;

  estimatedDeliveryMinutes:
    number;

  handlingInstructions:
    string[];

  compatibleSharedLoads:
    number;

  summary: string;
};

type Recommendation = {
  providerId: number;
  provider: string;

  confidence: number;

  reason: string;

  factors: string[];
};

type ShipmentStatus =
  | "DRAFT"
  | "ANALYZING"
  | "BIDDING"
  | "BID_ACCEPTED"
  | "DRIVER_TO_PICKUP"
  | "ARRIVED_PICKUP"
  | "PICKUP_VERIFIED"
  | "IN_TRANSIT"
  | "ARRIVED_DESTINATION"
  | "DELIVERY_VERIFIED"
  | "COMPLETED";

type SharedShipment = {
  id: string;

  customerName: string;

  pickup: string;
  destination: string;

  goodsType: string;
  weight: number;

  description: string;

  deliveryMode:
    DeliveryMode;

  customerType:
    CustomerType;

  status:
    ShipmentStatus;

  graphRoute: string[];

  analysis:
    SmartAnalysis | null;

  quotes:
    ProviderQuote[];

  recommendation:
    Recommendation | null;

  selectedProvider:
    ProviderQuote | null;

  pickupProof:
    string | null;

  deliveryProof:
    string | null;
};

/* ============================================================
   SHARED DEMO STORAGE

   Customer and Driver dashboards communicate through this.
   ============================================================ */

const ACTIVE_SHIPMENT_KEY =
  "transitgo_active_shipment";

const SHIPMENT_EVENT =
  "transitgo-shipment-updated";

function getActiveShipment():
  SharedShipment | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const data =
      localStorage.getItem(
        ACTIVE_SHIPMENT_KEY
      );

    if (!data) {
      return null;
    }

    return JSON.parse(
      data
    );
  } catch {
    return null;
  }
}

function saveActiveShipment(
  shipment:
    SharedShipment
) {
  localStorage.setItem(
    ACTIVE_SHIPMENT_KEY,
    JSON.stringify(
      shipment
    )
  );

  window.dispatchEvent(
    new Event(
      SHIPMENT_EVENT
    )
  );
}

function updateActiveShipment(
  updates:
    Partial<SharedShipment>
) {
  const current =
    getActiveShipment();

  if (!current) {
    return;
  }

  saveActiveShipment({
    ...current,
    ...updates,
  });
}

/* ============================================================
   KARACHI MOCK GRAPH

   Dijkstra/Prim/Kruskal remain implementation details.
   They are NOT shown in the customer interface.
   ============================================================ */

const GRAPH: Graph = {
  Clifton: {
    DHA: 4,
    Saddar: 7,
    PECHS: 10,
  },

  DHA: {
    Clifton: 4,
    Saddar: 8,
    Korangi: 6,
  },

  Saddar: {
    Clifton: 7,
    DHA: 8,
    PECHS: 4,
    Gulshan: 9,
    NorthNazimabad: 11,
  },

  PECHS: {
    Clifton: 10,
    Saddar: 4,
    Gulshan: 5,
    Korangi: 6,
  },

  Gulshan: {
    Saddar: 9,
    PECHS: 5,
    Korangi: 7,
    NorthNazimabad: 6,
  },

  Korangi: {
    DHA: 6,
    PECHS: 6,
    Gulshan: 7,
  },

  NorthNazimabad: {
    Saddar: 11,
    Gulshan: 6,
  },
};

const LOCATIONS:
  Record<
    string,
    LocationInfo
  > = {
  Clifton: {
    name: "Clifton",

    coordinates: [
      24.8138,
      67.0304,
    ],
  },

  DHA: {
    name: "DHA",

    coordinates: [
      24.7925,
      67.0671,
    ],
  },

  Saddar: {
    name: "Saddar",

    coordinates: [
      24.8565,
      67.0321,
    ],
  },

  PECHS: {
    name: "PECHS",

    coordinates: [
      24.8724,
      67.0648,
    ],
  },

  Gulshan: {
    name:
      "Gulshan-e-Iqbal",

    coordinates: [
      24.918,
      67.0971,
    ],
  },

  Korangi: {
    name: "Korangi",

    coordinates: [
      24.8365,
      67.1232,
    ],
  },

  NorthNazimabad: {
    name:
      "North Nazimabad",

    coordinates: [
      24.9408,
      67.0345,
    ],
  },
};

const NODES =
  Object.keys(GRAPH);

/* ============================================================
   DIJKSTRA
   ============================================================ */

function dijkstra(
  graph: Graph,
  start: string,
  destination: string
): PathResult {
  const distances:
    Record<
      string,
      number
    > = {};

  const previous:
    Record<
      string,
      string | null
    > = {};

  const unvisited =
    new Set(
      Object.keys(graph)
    );

  for (
    const node of
    Object.keys(graph)
  ) {
    distances[node] =
      Infinity;

    previous[node] =
      null;
  }

  distances[start] = 0;

  while (
    unvisited.size > 0
  ) {
    let current:
      | string
      | null = null;

    let smallest =
      Infinity;

    for (
      const node of unvisited
    ) {
      if (
        distances[node] <
        smallest
      ) {
        current = node;

        smallest =
          distances[node];
      }
    }

    if (!current) {
      break;
    }

    if (
      current ===
      destination
    ) {
      break;
    }

    unvisited.delete(
      current
    );

    for (const [
      neighbour,
      weight,
    ] of Object.entries(
      graph[current]
    )) {
      if (
        !unvisited.has(
          neighbour
        )
      ) {
        continue;
      }

      const candidate =
        distances[current] +
        weight;

      if (
        candidate <
        distances[
          neighbour
        ]
      ) {
        distances[
          neighbour
        ] = candidate;

        previous[
          neighbour
        ] = current;
      }
    }
  }

  const path: string[] =
    [];

  let current:
    | string
    | null =
    destination;

  while (current) {
    path.unshift(
      current
    );

    current =
      previous[current];
  }

  if (
    path[0] !== start
  ) {
    return {
      path: [],
      distance: Infinity,
    };
  }

  return {
    path,

    distance:
      distances[
        destination
      ],
  };
}

/* ============================================================
   UNION-FIND + KRUSKAL
   ============================================================ */

class UnionFind {
  parent:
    Record<
      string,
      string
    > = {};

  rank:
    Record<
      string,
      number
    > = {};

  constructor(
    nodes: string[]
  ) {
    for (
      const node of nodes
    ) {
      this.parent[node] =
        node;

      this.rank[node] = 0;
    }
  }

  find(
    node: string
  ): string {
    if (
      this.parent[node] !==
      node
    ) {
      this.parent[node] =
        this.find(
          this.parent[node]
        );
    }

    return this.parent[node];
  }

  union(
    a: string,
    b: string
  ) {
    const rootA =
      this.find(a);

    const rootB =
      this.find(b);

    if (
      rootA === rootB
    ) {
      return false;
    }

    if (
      this.rank[rootA] <
      this.rank[rootB]
    ) {
      this.parent[rootA] =
        rootB;
    } else if (
      this.rank[rootA] >
      this.rank[rootB]
    ) {
      this.parent[rootB] =
        rootA;
    } else {
      this.parent[rootB] =
        rootA;

      this.rank[rootA]++;
    }

    return true;
  }
}

function uniqueEdges(
  graph: Graph
): Edge[] {
  const result: Edge[] =
    [];

  const seen =
    new Set<string>();

  for (
    const from of
    Object.keys(graph)
  ) {
    for (const [
      to,
      weight,
    ] of Object.entries(
      graph[from]
    )) {
      const key = [
        from,
        to,
      ]
        .sort()
        .join("-");

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      result.push({
        from,
        to,
        weight,
      });
    }
  }

  return result;
}

function kruskal(
  graph: Graph
): MSTResult {
  const nodes =
    Object.keys(graph);

  const edges =
    uniqueEdges(graph).sort(
      (a, b) =>
        a.weight -
        b.weight
    );

  const uf =
    new UnionFind(nodes);

  const mst: Edge[] =
    [];

  let totalWeight = 0;

  for (
    const edge of edges
  ) {
    if (
      uf.union(
        edge.from,
        edge.to
      )
    ) {
      mst.push(edge);

      totalWeight +=
        edge.weight;
    }

    if (
      mst.length ===
      nodes.length - 1
    ) {
      break;
    }
  }

  return {
    edges: mst,
    totalWeight,
  };
}

/* ============================================================
   PRIM
   ============================================================ */

function prim(
  graph: Graph,
  start =
    Object.keys(graph)[0]
): MSTResult {
  const visited =
    new Set([
      start,
    ]);

  const mst: Edge[] =
    [];

  let totalWeight = 0;

  while (
    visited.size <
    Object.keys(graph)
      .length
  ) {
    let minimum:
      | Edge
      | null = null;

    for (
      const from of visited
    ) {
      for (const [
        to,
        weight,
      ] of Object.entries(
        graph[from]
      )) {
        if (
          visited.has(to)
        ) {
          continue;
        }

        if (
          !minimum ||
          weight <
            minimum.weight
        ) {
          minimum = {
            from,
            to,
            weight,
          };
        }
      }
    }

    if (!minimum) {
      break;
    }

    mst.push(
      minimum
    );

    totalWeight +=
      minimum.weight;

    visited.add(
      minimum.to
    );
  }

  return {
    edges: mst,
    totalWeight,
  };
}

/* ============================================================
   SHARED ROUTE COMPATIBILITY
   ============================================================ */

function routeSimilarity(
  a: string[],
  b: string[]
) {
  if (
    !a.length ||
    !b.length
  ) {
    return 0;
  }

  const common =
    a.filter(
      (node) =>
        b.includes(node)
    ).length;

  return Math.round(
    (common /
      Math.max(
        a.length,
        b.length
      )) *
      100
  );
}

/* ============================================================
   FLEET
   ============================================================ */

function eligibleClasses(
  weight: number
): VehicleClass[] {
  if (weight <= 15) {
    return [
      "BIKE",
      "LOADING_RICKSHAW",
      "LTV",
      "HTV",
    ];
  }

  if (weight <= 300) {
    return [
      "LOADING_RICKSHAW",
      "LTV",
      "HTV",
    ];
  }

  if (
    weight <= 1000
  ) {
    return [
      "LTV",
      "HTV",
    ];
  }

  return [
    "HTV",
  ];
}

function vehicleLabel(
  type:
    VehicleClass
) {
  switch (type) {
    case "BIKE":
      return "Bike";

    case "LOADING_RICKSHAW":
      return "Loading Rickshaw";

    case "LTV":
      return "LTV";

    case "HTV":
      return "HTV";
  }
}

const PROVIDERS:
  Provider[] = [
  {
    id: 1,

    rider:
      "Ahmed Raza",

    rating: 4.9,

    vehicleName:
      "Toyota Yaris",

    vehicleClass:
      "LTV",

    maxLoadKg: 350,

    eta: 5,

    distanceAway: 1.4,

    sharedSupported:
      true,

    priceBias:
      -0.04,
  },

  {
    id: 2,

    rider:
      "Hamza Khan",

    rating: 4.7,

    vehicleName:
      "Honda CG 125",

    vehicleClass:
      "BIKE",

    maxLoadKg: 20,

    eta: 3,

    distanceAway: 0.9,

    sharedSupported:
      true,

    priceBias:
      -0.08,
  },

  {
    id: 3,

    rider:
      "Saad Logistics",

    rating: 4.8,

    vehicleName:
      "Suzuki Ravi",

    vehicleClass:
      "LTV",

    maxLoadKg: 700,

    eta: 7,

    distanceAway: 2.5,

    sharedSupported:
      true,

    priceBias:
      0.03,
  },

  {
    id: 4,

    rider:
      "Usman Cargo",

    rating: 4.9,

    vehicleName:
      "Loading Rickshaw",

    vehicleClass:
      "LOADING_RICKSHAW",

    maxLoadKg: 400,

    eta: 4,

    distanceAway: 1.7,

    sharedSupported:
      true,

    priceBias:
      -0.06,
  },

  {
    id: 5,

    rider:
      "Bilal Transport",

    rating: 4.9,

    vehicleName:
      "Isuzu NPR",

    vehicleClass:
      "HTV",

    maxLoadKg: 5000,

    eta: 12,

    distanceAway: 4.2,

    sharedSupported:
      false,

    priceBias:
      0.18,
  },
];

const SHARED_JOBS = [
  {
    pickup:
      "Clifton",

    destination:
      "PECHS",
  },

  {
    pickup:
      "DHA",

    destination:
      "Gulshan",
  },

  {
    pickup:
      "Saddar",

    destination:
      "Gulshan",
  },
];

/* ============================================================
   ROAD ROUTING
   ============================================================ */

async function roadBetweenCoordinates(
  points:
    [number, number][]
): Promise<
  [number, number][]
> {
  if (
    points.length < 2
  ) {
    return points;
  }

  const query =
    points
      .map(
        ([lat, lng]) =>
          `${lng},${lat}`
      )
      .join(";");

  try {
    const response =
      await fetch(
        `https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson&steps=false`
      );

    if (
      !response.ok
    ) {
      throw new Error();
    }

    const data =
      await response.json();

    const raw =
      data.routes?.[0]
        ?.geometry
        ?.coordinates;

    if (!raw) {
      throw new Error();
    }

    return raw.map(
      (
        coordinate:
          [
            number,
            number
          ]
      ) =>
        [
          coordinate[1],
          coordinate[0],
        ] as [
          number,
          number
        ]
    );
  } catch {
    return points;
  }
}

async function roadForGraphPath(
  path: string[]
) {
  const points =
    path.map(
      (node) =>
        LOCATIONS[
          node
        ].coordinates
    );

  return roadBetweenCoordinates(
    points
  );
}

/* ============================================================
   MAP
   ============================================================ */

const TransitMap = dynamic(
  async () => {
    const {
      MapContainer,
      TileLayer,
      Polyline,
      CircleMarker,
      Marker,
      Popup,
      useMap,
    } = await import(
      "react-leaflet"
    );

    const L =
      await import(
        "leaflet"
      );

    const truckIcon =
      L.divIcon({
        className: "",

        html: `
          <div style="
            width:44px;
            height:44px;
            background:#111827;
            color:white;
            border-radius:15px;
            border:3px solid white;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:21px;
            box-shadow:0 8px 24px rgba(15,23,42,.28);
          ">
            🚚
          </div>
        `,

        iconSize: [
          44,
          44,
        ],

        iconAnchor: [
          22,
          22,
        ],
      });

    function FitMap({
      geometry,
    }: {
      geometry:
        [number, number][];
    }) {
      const map =
        useMap();

      useEffect(() => {
        if (
          geometry.length <
          2
        ) {
          return;
        }

        map.fitBounds(
          geometry,
          {
            padding: [
              75,
              75,
            ],

            maxZoom: 13,
          }
        );
      }, [
        geometry,
        map,
      ]);

      return null;
    }

    function MapComponent({
      graphRoute,
      vehiclePosition,
      status,
    }: {
      graphRoute:
        string[];

      vehiclePosition:
        [number, number] | null;

      status:
        ShipmentStatus;
    }) {
      const [
        destinationRoad,
        setDestinationRoad,
      ] =
        useState<
          [number, number][]
        >([]);

      useEffect(() => {
        let alive = true;

        roadForGraphPath(
          graphRoute
        ).then(
          (road) => {
            if (alive) {
              setDestinationRoad(
                road
              );
            }
          }
        );

        return () => {
          alive = false;
        };
      }, [
        graphRoute,
      ]);

      return (
        <MapContainer
          center={[
            24.8607,
            67.0011,
          ]}
          zoom={11}
          zoomControl={
            false
          }
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {Object.entries(
            LOCATIONS
          ).map(
            ([
              key,
              location,
            ]) => {
              const active =
                graphRoute.includes(
                  key
                );

              return (
                <CircleMarker
                  key={key}
                  center={
                    location.coordinates
                  }
                  radius={
                    active
                      ? 7
                      : 4
                  }
                  pathOptions={{
                    color:
                      active
                        ? "#7c3aed"
                        : "#94a3b8",

                    fillColor:
                      active
                        ? "#8b5cf6"
                        : "#cbd5e1",

                    fillOpacity: 1,

                    weight: 2,
                  }}
                >
                  <Popup>
                    {
                      location.name
                    }
                  </Popup>
                </CircleMarker>
              );
            }
          )}

          {destinationRoad.length >
            1 && (
            <>
              <Polyline
                positions={
                  destinationRoad
                }
                pathOptions={{
                  color:
                    "#8b5cf6",

                  weight: 12,

                  opacity:
                    0.18,
                }}
              />

              <Polyline
                positions={
                  destinationRoad
                }
                pathOptions={{
                  color:
                    "#6d28d9",

                  weight: 5,

                  opacity:
                    0.95,
                }}
              />

              <FitMap
                geometry={
                  destinationRoad
                }
              />
            </>
          )}

          {vehiclePosition && (
            <Marker
              position={
                vehiclePosition
              }
              icon={
                truckIcon
              }
            >
              <Popup>
                {mapStatusText(
                  status
                )}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      );
    }

    return MapComponent;
  },

  {
    ssr: false,

    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-100 text-xs font-semibold text-slate-500">
        Preparing live map...
      </div>
    ),
  }
);

/* ============================================================
   ROOT
   ============================================================ */

export default function Home() {
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<DemoUser | null>(
      null
    );

  const [
    loaded,
    setLoaded,
  ] =
    useState(false);

  useEffect(() => {
    const stored =
      localStorage.getItem(
        "transitgo_session"
      );

    if (stored) {
      try {
        setCurrentUser(
          JSON.parse(
            stored
          )
        );
      } catch {
        localStorage.removeItem(
          "transitgo_session"
        );
      }
    }

    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 font-bold text-white">
        Loading TransitGo...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={
          setCurrentUser
        }
      />
    );
  }

  const logout = () => {
    localStorage.removeItem(
      "transitgo_session"
    );

    setCurrentUser(null);
  };

  if (
    currentUser.role ===
    "PROVIDER"
  ) {
    return (
      <ProviderDashboard
        user={
          currentUser
        }
        logout={
          logout
        }
      />
    );
  }

  return (
    <CustomerDashboard
      user={
        currentUser
      }
      logout={
        logout
      }
    />
  );
}

/* ============================================================
   AUTH
   ============================================================ */

function AuthScreen({
  onLogin,
}: {
  onLogin: (
    user: DemoUser
  ) => void;
}) {
  const [
    mode,
    setMode,
  ] =
    useState<
      "LOGIN" | "REGISTER"
    >("LOGIN");

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    email,
    setEmail,
  ] =
    useState(
      "demo@transitgo.com"
    );

  const [
    password,
    setPassword,
  ] =
    useState(
      "123456"
    );

  const [
    role,
    setRole,
  ] =
    useState<UserRole>(
      "CUSTOMER"
    );

  const [
    error,
    setError,
  ] =
    useState("");

  function submit(
    event: FormEvent
  ) {
    event.preventDefault();

    /*
      CUSTOMER DEMO
    */

    if (
      mode === "LOGIN" &&
      email ===
        "demo@transitgo.com" &&
      password === "123456"
    ) {
      const user:
        DemoUser = {
        name:
          "TransitGo Customer",

        email,

        password,

        role:
          "CUSTOMER",
      };

      localStorage.setItem(
        "transitgo_session",
        JSON.stringify(
          user
        )
      );

      onLogin(user);

      return;
    }

    /*
      DRIVER DEMO
    */

    if (
      mode === "LOGIN" &&
      email ===
        "driver@transitgo.com" &&
      password === "123456"
    ) {
      const user:
        DemoUser = {
        name:
          "Ahmed Raza",

        email,

        password,

        role:
          "PROVIDER",
      };

      localStorage.setItem(
        "transitgo_session",
        JSON.stringify(
          user
        )
      );

      onLogin(user);

      return;
    }

    if (
      mode ===
      "REGISTER"
    ) {
      if (
        !name ||
        !email ||
        !password
      ) {
        setError(
          "Complete all fields."
        );

        return;
      }

      const user:
        DemoUser = {
        name,
        email,
        password,
        role,
      };

      const users =
        JSON.parse(
          localStorage.getItem(
            "transitgo_users"
          ) || "[]"
        ) as DemoUser[];

      users.push(user);

      localStorage.setItem(
        "transitgo_users",
        JSON.stringify(
          users
        )
      );

      localStorage.setItem(
        "transitgo_session",
        JSON.stringify(
          user
        )
      );

      onLogin(user);

      return;
    }

    const users =
      JSON.parse(
        localStorage.getItem(
          "transitgo_users"
        ) || "[]"
      ) as DemoUser[];

    const found =
      users.find(
        (item) =>
          item.email ===
            email &&
          item.password ===
            password
      );

    if (!found) {
      setError(
        "Invalid email or password."
      );

      return;
    }

    localStorage.setItem(
      "transitgo_session",
      JSON.stringify(
        found
      )
    );

    onLogin(found);
  }

  return (
    <main className="grid min-h-screen bg-[#090b10] lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-gradient-to-br from-violet-700 via-violet-950 to-slate-950 p-12 text-white lg:flex">
        <Brand light />

        <div>
          <p className="max-w-xl text-5xl font-black leading-[1.06]">
            Logistics built for
            people, drivers and
            businesses.
          </p>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
            Intelligent shipment
            analysis, transport
            bidding, road-aware
            routing and live
            delivery tracking.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <DarkFeature
              title="Customer Portal"
              text="Request, compare and track shipments"
            />

            <DarkFeature
              title="Driver Portal"
              text="Bid, collect, verify and deliver"
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          TransitGo
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md text-white">
          <div className="mb-8 lg:hidden">
            <Brand light />
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
            TransitGo
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            {mode ===
            "LOGIN"
              ? "Welcome back"
              : "Create account"}
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            Access your
            TransitGo workspace.
          </p>

          <div className="mt-7 grid grid-cols-2 rounded-xl bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => {
                setMode(
                  "LOGIN"
                );

                setError("");
              }}
              className={`rounded-lg py-2.5 text-xs font-black ${
                mode ===
                "LOGIN"
                  ? "bg-violet-600"
                  : "text-slate-400"
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(
                  "REGISTER"
                );

                setError("");
              }}
              className={`rounded-lg py-2.5 text-xs font-black ${
                mode ===
                "REGISTER"
                  ? "bg-violet-600"
                  : "text-slate-400"
              }`}
            >
              Register
            </button>
          </div>

          <form
            onSubmit={
              submit
            }
            className="mt-5 space-y-4"
          >
            {mode ===
              "REGISTER" && (
              <AuthInput
                label="Full name"
                value={name}
                setValue={
                  setName
                }
              />
            )}

            <AuthInput
              label="Email"
              value={email}
              setValue={
                setEmail
              }
              type="email"
            />

            <AuthInput
              label="Password"
              value={password}
              setValue={
                setPassword
              }
              type="password"
            />

            {mode ===
              "REGISTER" && (
              <div>
                <Label>
                  Account Role
                </Label>

                <div className="grid grid-cols-2 gap-2">
                  <Choice
                    active={
                      role ===
                      "CUSTOMER"
                    }
                    onClick={() =>
                      setRole(
                        "CUSTOMER"
                      )
                    }
                    icon={
                      <UserRound
                        size={17}
                      />
                    }
                    title="Customer"
                    subtitle="Send goods"
                  />

                  <Choice
                    active={
                      role ===
                      "PROVIDER"
                    }
                    onClick={() =>
                      setRole(
                        "PROVIDER"
                      )
                    }
                    icon={
                      <Truck
                        size={17}
                      />
                    }
                    title="Driver"
                    subtitle="Transport goods"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl bg-red-500/10 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <button className="w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-black transition hover:bg-violet-500">
              {mode ===
              "LOGIN"
                ? "Continue"
                : "Create Account"}
            </button>
          </form>

          {mode ===
            "LOGIN" && (
            <div className="mt-7 grid gap-2">
              <DemoAccount
                title="Customer Demo"
                email="demo@transitgo.com"
                onClick={() => {
                  setEmail(
                    "demo@transitgo.com"
                  );

                  setPassword(
                    "123456"
                  );
                }}
              />

              <DemoAccount
                title="Driver Demo"
                email="driver@transitgo.com"
                onClick={() => {
                  setEmail(
                    "driver@transitgo.com"
                  );

                  setPassword(
                    "123456"
                  );
                }}
              />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* ============================================================
   CUSTOMER DASHBOARD
   ============================================================ */

function CustomerDashboard({
  user,
  logout,
}: {
  user: DemoUser;
  logout: () => void;
}) {
  const [
    customerType,
    setCustomerType,
  ] =
    useState<CustomerType>(
      "INDIVIDUAL"
    );

  const [
    deliveryMode,
    setDeliveryMode,
  ] =
    useState<DeliveryMode>(
      "DIRECT"
    );

  const [
    pickup,
    setPickup,
  ] =
    useState("Clifton");

  const [
    destination,
    setDestination,
  ] =
    useState("Gulshan");

  const [
    goodsType,
    setGoodsType,
  ] =
    useState("Electronics");

  const [
    weight,
    setWeight,
  ] =
    useState("7");

  const [
    description,
    setDescription,
  ] =
    useState(
      "32 inch LED monitor, fragile electronic equipment. Keep upright."
    );

  const [
    companyName,
    setCompanyName,
  ] =
    useState(
      "Vertex Commerce"
    );

  const [
    businessType,
    setBusinessType,
  ] =
    useState(
      "E-Commerce"
    );

  const [
    status,
    setStatus,
  ] =
    useState<ShipmentStatus>(
      "DRAFT"
    );

  const [
    route,
    setRoute,
  ] =
    useState<PathResult>(() =>
      dijkstra(
        GRAPH,
        "Clifton",
        "Gulshan"
      )
    );

  const [
    analysis,
    setAnalysis,
  ] =
    useState<SmartAnalysis | null>(
      null
    );

  const [
    quotes,
    setQuotes,
  ] =
    useState<
      ProviderQuote[]
    >([]);

  const [
    recommendation,
    setRecommendation,
  ] =
    useState<Recommendation | null>(
      null
    );

  const [
    selectedProvider,
    setSelectedProvider,
  ] =
    useState<ProviderQuote | null>(
      null
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "Enter shipment details and request transport bids."
    );

  const [
    vehiclePosition,
    setVehiclePosition,
  ] =
    useState<
      [number, number] | null
    >(null);

  const [
    deliveryRoad,
    setDeliveryRoad,
  ] =
    useState<
      [number, number][]
    >([]);

  const animationRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  const transitAnimationStarted =
    useRef(false);

  /*
    Full graph-engine implementation remains
    active but invisible to the UI.
  */

  useMemo(
    () => prim(GRAPH),
    []
  );

  useMemo(
    () => kruskal(GRAPH),
    []
  );

  const eligibleProviders =
    useMemo(() => {
      const shipmentWeight =
        Number(weight) || 0;

      const classes =
        eligibleClasses(
          shipmentWeight
        );

      return PROVIDERS.filter(
        (provider) =>
          classes.includes(
            provider.vehicleClass
          ) &&
          provider.maxLoadKg >=
            shipmentWeight &&
          (
            deliveryMode !==
              "SHARED" ||
            provider.sharedSupported
          )
      );
    }, [
      weight,
      deliveryMode,
    ]);

  function countSharedMatches(
    graphRoute:
      string[]
  ) {
    return SHARED_JOBS.map(
      (job) => {
        const result =
          dijkstra(
            GRAPH,
            job.pickup,
            job.destination
          );

        return routeSimilarity(
          graphRoute,
          result.path
        );
      }
    ).filter(
      (score) =>
        score >= 40
    ).length;
  }

  function clearAnimation() {
    if (
      animationRef.current
    ) {
      clearInterval(
        animationRef.current
      );

      animationRef.current =
        null;
    }
  }

  async function requestQuotes() {
    if (
      pickup ===
      destination
    ) {
      setMessage(
        "Pickup and destination must be different."
      );

      return;
    }

    setStatus(
      "ANALYZING"
    );

    setMessage(
      "Planning the shipment, evaluating transport requirements and collecting quotes..."
    );

    setAnalysis(null);
    setQuotes([]);
    setRecommendation(null);
    setSelectedProvider(null);
    setVehiclePosition(null);

    transitAnimationStarted.current =
      false;

    const routeResult =
      dijkstra(
        GRAPH,
        pickup,
        destination
      );

    setRoute(
      routeResult
    );

    const routeMinutes =
      Math.max(
        10,
        Math.round(
          routeResult.distance *
            1.8
        )
      );

    const sharedCount =
      countSharedMatches(
        routeResult.path
      );

    try {
      const response =
        await fetch(
          "/api/ai",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              {
                shipment: {
                  goodsType,

                  weight:
                    Number(
                      weight
                    ),

                  description,

                  pickup,

                  destination,

                  deliveryMode,

                  customerType,

                  companyName:
                    customerType ===
                    "BUSINESS"
                      ? companyName
                      : "",

                  businessType:
                    customerType ===
                    "BUSINESS"
                      ? businessType
                      : "",
                },

                routeCost:
                  routeResult.distance,

                routeMinutes,

                compatibleSharedLoads:
                  sharedCount,

                providers:
                  eligibleProviders,
              }
            ),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error
        );
      }

      setAnalysis(
        data.analysis
      );

      setQuotes(
        data.quotes
      );

      setRecommendation(
        data.recommendation
      );

      setStatus(
        "BIDDING"
      );

      setMessage(
        `${data.quotes.length} suitable provider quotes are available.`
      );

      const shared:
        SharedShipment = {
        id:
          `TG-${Date.now()}`,

        customerName:
          user.name,

        pickup,

        destination,

        goodsType,

        weight:
          Number(weight),

        description,

        deliveryMode,

        customerType,

        status:
          "BIDDING",

        graphRoute:
          routeResult.path,

        analysis:
          data.analysis,

        quotes:
          data.quotes,

        recommendation:
          data.recommendation,

        selectedProvider:
          null,

        pickupProof:
          null,

        deliveryProof:
          null,
      };

      saveActiveShipment(
        shared
      );
    } catch {
      setStatus(
        "DRAFT"
      );

      setMessage(
        "Unable to prepare quotes. Please try again."
      );
    }
  }

  async function acceptQuote(
    provider:
      ProviderQuote
  ) {
    clearAnimation();

    transitAnimationStarted.current =
      false;

    setSelectedProvider(
      provider
    );

    setStatus(
      "BID_ACCEPTED"
    );

    setMessage(
      `${provider.rider}'s quote was accepted. The driver is preparing to approach the pickup point.`
    );

    updateActiveShipment({
      selectedProvider:
        provider,

      status:
        "BID_ACCEPTED",
    });

    /*
      Prepare pickup → destination
      road geometry now.
    */

    const destinationGeometry =
      await roadForGraphPath(
        route.path
      );

    setDeliveryRoad(
      destinationGeometry
    );

    /*
      Simulated driver's initial
      nearby position.
    */

    const [
      pickupLat,
      pickupLng,
    ] =
      LOCATIONS[
        pickup
      ].coordinates;

    const driverStart:
      [number, number] = [
      pickupLat - 0.016,
      pickupLng - 0.012,
    ];

    setVehiclePosition(
      driverStart
    );

    /*
      Route driver to pickup using
      roads instead of straight-line
      interpolation.
    */

    const approachRoad =
      await roadBetweenCoordinates(
        [
          driverStart,

          LOCATIONS[
            pickup
          ].coordinates,
        ]
      );

    window.setTimeout(
      () => {
        animateApproach(
          approachRoad
        );
      },
      650
    );
  }

  function animateApproach(
    road:
      [number, number][]
  ) {
    if (
      road.length < 2
    ) {
      return;
    }

    clearAnimation();

    setStatus(
      "DRIVER_TO_PICKUP"
    );

    setMessage(
      "Your driver is heading toward the pickup location."
    );

    updateActiveShipment({
      status:
        "DRIVER_TO_PICKUP",
    });

    let index = 0;

    const jump =
      Math.max(
        1,
        Math.floor(
          road.length / 85
        )
      );

    animationRef.current =
      setInterval(
        () => {
          index += jump;

          if (
            index >=
            road.length
          ) {
            index =
              road.length - 1;
          }

          setVehiclePosition(
            road[index]
          );

          if (
            index >=
            road.length - 1
          ) {
            clearAnimation();

            setVehiclePosition(
              LOCATIONS[
                pickup
              ].coordinates
            );

            setStatus(
              "ARRIVED_PICKUP"
            );

            setMessage(
              "Driver has reached the pickup point. Waiting for the driver to collect the goods and upload pickup proof."
            );

            updateActiveShipment({
              status:
                "ARRIVED_PICKUP",
            });
          }
        },
        75
      );
  }

  function animateToDestination(
    road:
      [number, number][]
  ) {
    if (
      road.length < 2
    ) {
      return;
    }

    clearAnimation();

    transitAnimationStarted.current =
      true;

    setStatus(
      "IN_TRANSIT"
    );

    setMessage(
      "Pickup has been verified. Your shipment is now heading toward the destination."
    );

    let index = 0;

    const jump =
      Math.max(
        1,
        Math.floor(
          road.length /
            150
        )
      );

    animationRef.current =
      setInterval(
        () => {
          index += jump;

          if (
            index >=
            road.length
          ) {
            index =
              road.length - 1;
          }

          setVehiclePosition(
            road[index]
          );

          if (
            index >=
            road.length - 1
          ) {
            clearAnimation();

            const destinationPoint =
              LOCATIONS[
                destination
              ].coordinates;

            setVehiclePosition(
              destinationPoint
            );

            setStatus(
              "ARRIVED_DESTINATION"
            );

            setMessage(
              "The driver reached the destination. Waiting for delivery proof."
            );

            updateActiveShipment({
              status:
                "ARRIVED_DESTINATION",
            });
          }
        },
        70
      );
  }

  /*
    Customer synchronizes changes
    made by the Driver dashboard.

    Polling makes this reliable even
    when testing using separate tabs.
  */

  useEffect(() => {
    const sync =
      () => {
        const shared =
          getActiveShipment();

        if (!shared) {
          return;
        }

        setStatus(
          shared.status
        );

        setSelectedProvider(
          shared.selectedProvider
        );

        setQuotes(
          shared.quotes
        );

        if (
          shared.status ===
          "PICKUP_VERIFIED"
        ) {
          setMessage(
            "Pickup proof has been verified. Waiting for the driver to start delivery."
          );
        }

        if (
          shared.status ===
            "IN_TRANSIT" &&
          !transitAnimationStarted.current
        ) {
          /*
            Driver clicked START DELIVERY.
            Now the customer sees the
            truck physically leave pickup.
          */

          const startTrip =
            async () => {
              let road =
                deliveryRoad;

              if (
                road.length <
                2
              ) {
                road =
                  await roadForGraphPath(
                    shared.graphRoute
                  );

                setDeliveryRoad(
                  road
                );
              }

              animateToDestination(
                road
              );
            };

          startTrip();
        }

        if (
          shared.status ===
          "DELIVERY_VERIFIED"
        ) {
          setMessage(
            "Delivery proof was submitted. Waiting for the driver to close the trip."
          );
        }

        if (
          shared.status ===
          "COMPLETED"
        ) {
          clearAnimation();

          setStatus(
            "COMPLETED"
          );

          setVehiclePosition(
            LOCATIONS[
              shared.destination
            ].coordinates
          );

          setMessage(
            "Shipment completed successfully."
          );
        }
      };

    sync();

    const interval =
      window.setInterval(
        sync,
        600
      );

    window.addEventListener(
      "storage",
      sync
    );

    window.addEventListener(
      SHIPMENT_EVENT,
      sync
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "storage",
        sync
      );

      window.removeEventListener(
        SHIPMENT_EVENT,
        sync
      );
    };
  }, [
    deliveryRoad,
    destination,
  ]);

  useEffect(() => {
    return () => {
      clearAnimation();
    };
  }, []);

  return (
    <AppShell
      user={user}
      logout={logout}
      roleLabel="Customer"
    >
      <Hero
        title="Move goods with confidence."
        description="Request transport, compare intelligent quotes and follow the assigned vehicle throughout the complete delivery lifecycle."
      />

      <div className="mt-5 grid gap-5 lg:grid-cols-[420px_1fr]">
        {/* ================================================
            CUSTOMER REQUEST
            ================================================ */}

        <div className="space-y-5">
          <Panel>
            <PanelTitle
              icon={
                <Package
                  size={18}
                />
              }
              eyebrow="New Shipment"
              title="Delivery details"
            />

            <div className="mt-5">
              <Label>
                Customer Type
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <Choice
                  active={
                    customerType ===
                    "INDIVIDUAL"
                  }
                  onClick={() =>
                    setCustomerType(
                      "INDIVIDUAL"
                    )
                  }
                  icon={
                    <UserRound
                      size={16}
                    />
                  }
                  title="Individual"
                  subtitle="Personal shipment"
                />

                <Choice
                  active={
                    customerType ===
                    "BUSINESS"
                  }
                  onClick={() =>
                    setCustomerType(
                      "BUSINESS"
                    )
                  }
                  icon={
                    <Building2
                      size={16}
                    />
                  }
                  title="Business"
                  subtitle="Contract logistics"
                />
              </div>
            </div>

            {customerType ===
              "BUSINESS" && (
              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <Label>
                  Company
                </Label>

                <input
                  value={
                    companyName
                  }
                  onChange={(e) =>
                    setCompanyName(
                      e.target.value
                    )
                  }
                  className="input"
                />

                <div className="mt-3">
                  <Label>
                    Industry
                  </Label>

                  <select
                    value={
                      businessType
                    }
                    onChange={(e) =>
                      setBusinessType(
                        e.target.value
                      )
                    }
                    className="input"
                  >
                    <option>
                      E-Commerce
                    </option>

                    <option>
                      Retail
                    </option>

                    <option>
                      Manufacturing
                    </option>

                    <option>
                      Pharmacy
                    </option>

                    <option>
                      Food
                    </option>
                  </select>
                </div>

                <p className="mt-3 text-[10px] leading-relaxed text-indigo-700">
                  Business customers
                  can represent
                  recurring contracts,
                  fleet commitments
                  and priority
                  logistics handling.
                </p>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <LocationSelect
                label="Pickup"
                value={
                  pickup
                }
                setValue={
                  setPickup
                }
              />

              <LocationSelect
                label="Destination"
                value={
                  destination
                }
                setValue={
                  setDestination
                }
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>
                  Goods Type
                </Label>

                <select
                  value={
                    goodsType
                  }
                  onChange={(e) =>
                    setGoodsType(
                      e.target.value
                    )
                  }
                  className="input"
                >
                  <option>
                    Electronics
                  </option>

                  <option>
                    Documents
                  </option>

                  <option>
                    Food
                  </option>

                  <option>
                    Clothing
                  </option>

                  <option>
                    Furniture
                  </option>

                  <option>
                    Medical Supplies
                  </option>

                  <option>
                    Industrial Goods
                  </option>

                  <option>
                    General Cargo
                  </option>
                </select>
              </div>

              <div>
                <Label>
                  Weight
                </Label>

                <div className="input flex items-center">
                  <Scale
                    size={14}
                    className="mr-2 text-slate-400"
                  />

                  <input
                    type="number"
                    min="1"
                    value={
                      weight
                    }
                    onChange={(e) =>
                      setWeight(
                        e.target.value
                      )
                    }
                    className="min-w-0 flex-1 bg-transparent outline-none"
                  />

                  <span className="text-xs text-slate-400">
                    kg
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <Label>
                Package Details
              </Label>

              <textarea
                rows={4}
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                className="input resize-none"
              />
            </div>

            <div className="mt-4">
              <Label>
                Delivery Preference
              </Label>

              <div className="grid grid-cols-2 gap-2">
                <Choice
                  active={
                    deliveryMode ===
                    "DIRECT"
                  }
                  onClick={() =>
                    setDeliveryMode(
                      "DIRECT"
                    )
                  }
                  icon={
                    <Truck
                      size={17}
                    />
                  }
                  title="Direct"
                  subtitle="Dedicated & fastest"
                />

                <Choice
                  active={
                    deliveryMode ===
                    "SHARED"
                  }
                  onClick={() =>
                    setDeliveryMode(
                      "SHARED"
                    )
                  }
                  icon={
                    <Package
                      size={17}
                    />
                  }
                  title="Smart Share"
                  subtitle="Lower cost"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={
                requestQuotes
              }
              disabled={
                status ===
                "ANALYZING"
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-50"
            >
              {status ===
              "ANALYZING" ? (
                <>
                  <BrainCircuit
                    size={17}
                    className="animate-pulse"
                  />

                  Preparing Smart
                  Quotes...
                </>
              ) : (
                <>
                  <Zap
                    size={17}
                  />

                  Send for Bids
                </>
              )}
            </button>
          </Panel>

          {/* ================================================
              AI INTELLIGENCE
              ================================================ */}

          {analysis && (
            <Panel>
              <PanelTitle
                icon={
                  <BrainCircuit
                    size={18}
                  />
                }
                eyebrow="Smart Analysis"
                title="Shipment intelligence"
              />

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric
                  label="Category"
                  value={
                    analysis.category
                  }
                />

                <Metric
                  label="Risk"
                  value={
                    analysis.riskLevel
                  }
                />

                <Metric
                  label="Fragility"
                  value={
                    analysis.fragility
                  }
                />

                <Metric
                  label="Vehicle"
                  value={
                    analysis.recommendedVehicleClass
                  }
                />
              </div>

              <div className="mt-3 rounded-2xl bg-violet-50 p-4">
                <p className="text-[9px] font-black uppercase tracking-wider text-violet-500">
                  Expected Market
                  Range
                </p>

                <p className="mt-2 text-xl font-black text-violet-950">
                  Rs.{" "}
                  {
                    analysis.estimatedFareMin
                  }
                  {" – "}
                  Rs.{" "}
                  {
                    analysis.estimatedFareMax
                  }
                </p>

                <p className="mt-1 text-[9px] text-violet-700">
                  Final charge is
                  determined by the
                  accepted transport
                  provider quote.
                </p>
              </div>

              {deliveryMode ===
                "SHARED" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Metric
                    label="Compatible Loads"
                    value={`${analysis.compatibleSharedLoads}`}
                  />

                  <Metric
                    label="Extra Delay"
                    value={`~${Math.max(
                      2,
                      Math.round(
                        analysis.estimatedDeliveryMinutes *
                          0.08
                      )
                    )} min`}
                  />
                </div>
              )}

              <div className="mt-4 space-y-2">
                {analysis.handlingInstructions.map(
                  (
                    instruction,
                    index
                  ) => (
                    <div
                      key={
                        index
                      }
                      className="flex gap-2 text-xs leading-relaxed text-slate-600"
                    >
                      <Check
                        size={13}
                        className="mt-0.5 shrink-0 text-emerald-500"
                      />

                      {
                        instruction
                      }
                    </div>
                  )
                )}
              </div>

              <p className="mt-4 text-xs leading-relaxed text-slate-500">
                {
                  analysis.summary
                }
              </p>
            </Panel>
          )}
        </div>

        {/* ================================================
            CUSTOMER MAP / TRACKING
            ================================================ */}

        <div className="space-y-5">
          <section className="relative h-[520px] overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <TransitMap
              graphRoute={
                route.path
              }
              vehiclePosition={
                vehiclePosition
              }
              status={
                status
              }
            />

            <div className="absolute left-4 top-4 z-[500] max-w-[285px] rounded-2xl border border-white/60 bg-white/95 p-4 shadow-xl backdrop-blur-xl">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                Shipment Route
              </p>

              <p className="mt-1 text-xs font-black">
                {
                  LOCATIONS[
                    pickup
                  ].name
                }

                <ArrowRight
                  size={12}
                  className="mx-2 inline text-violet-500"
                />

                {
                  LOCATIONS[
                    destination
                  ].name
                }
              </p>

              <p className="mt-1 text-[9px] text-slate-400">
                {deliveryMode ===
                "SHARED"
                  ? "Smart shared logistics"
                  : "Direct delivery"}
              </p>
            </div>

            {[
              "BID_ACCEPTED",
              "DRIVER_TO_PICKUP",
              "ARRIVED_PICKUP",
              "PICKUP_VERIFIED",
              "IN_TRANSIT",
              "ARRIVED_DESTINATION",
              "DELIVERY_VERIFIED",
              "COMPLETED",
            ].includes(
              status
            ) && (
              <div className="absolute bottom-4 left-4 right-4 z-[500] rounded-2xl bg-slate-950/95 p-4 text-white shadow-xl backdrop-blur-xl sm:left-auto sm:w-[360px]">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-violet-300">
                  Live Tracking
                </p>

                <p className="mt-1 text-sm font-black">
                  {customerStatusTitle(
                    status
                  )}
                </p>

                <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                  {message}
                </p>
              </div>
            )}
          </section>

          <Panel>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500">
                  Shipment Status
                </p>

                <h3 className="mt-1 text-xl font-black">
                  {customerStatusTitle(
                    status
                  )}
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {message}
                </p>
              </div>

              <StatusIcon
                status={
                  status
                }
              />
            </div>

            <ShipmentProgress
              status={
                status
              }
            />
          </Panel>

          {/* ================================================
              CUSTOMER BIDS
              ================================================ */}

          {status ===
            "BIDDING" && (
            <Panel>
              <PanelTitle
                icon={
                  <Wallet
                    size={18}
                  />
                }
                eyebrow="Transport Marketplace"
                title="Provider quotes"
              />

              {recommendation && (
                <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <div className="flex items-center gap-2">
                    <Sparkles
                      size={14}
                      className="text-violet-600"
                    />

                    <p className="text-[9px] font-black uppercase tracking-wider text-violet-600">
                      AI Recommended
                    </p>
                  </div>

                  <p className="mt-2 text-lg font-black">
                    {
                      recommendation.provider
                    }
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {
                      recommendation.reason
                    }
                  </p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {recommendation.factors?.map(
                      (
                        factor,
                        index
                      ) => (
                        <Badge
                          key={
                            index
                          }
                        >
                          {
                            factor
                          }
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {quotes.map(
                  (provider) => (
                    <ProviderQuoteCard
                      key={
                        provider.id
                      }
                      provider={
                        provider
                      }
                      recommended={
                        recommendation?.providerId ===
                        provider.id
                      }
                      onAccept={() =>
                        acceptQuote(
                          provider
                        )
                      }
                    />
                  )
                )}
              </div>
            </Panel>
          )}

          {/* ================================================
              CUSTOMER WAITING AT PICKUP

              NO UPLOAD CONTROL HERE.
              ================================================ */}

          {status ===
            "ARRIVED_PICKUP" && (
            <Panel>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                  <Package
                    size={23}
                  />
                </div>

                <div>
                  <p className="text-sm font-black">
                    Driver reached pickup
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    The driver must now
                    collect the goods and
                    submit pickup proof
                    from the Driver Portal.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {status ===
            "PICKUP_VERIFIED" && (
            <Panel>
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2
                    size={23}
                  />
                </div>

                <div>
                  <p className="text-sm font-black">
                    Pickup verified
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    The goods were
                    collected successfully.
                    Waiting for the driver
                    to start the trip.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {status ===
            "ARRIVED_DESTINATION" && (
            <Panel>
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <MapPin
                    size={23}
                  />
                </div>

                <div>
                  <p className="text-sm font-black">
                    Driver reached destination
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Waiting for the
                    driver to hand over
                    the goods and submit
                    delivery proof.
                  </p>
                </div>
              </div>
            </Panel>
          )}

          {status ===
            "COMPLETED" && (
            <section className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <CheckCircle2
                  size={29}
                />
              </div>

              <h3 className="mt-4 text-2xl font-black text-emerald-950">
                Delivery completed
              </h3>

              <p className="mt-2 text-sm leading-relaxed text-emerald-800">
                The shipment reached{" "}
                {
                  LOCATIONS[
                    destination
                  ].name
                }
                . Pickup and delivery
                verification have been
                completed successfully.
              </p>

              {selectedProvider && (
                <div className="mt-5 rounded-2xl bg-white p-4">
                  <p className="text-xs font-black">
                    {
                      selectedProvider.rider
                    }
                  </p>

                  <p className="mt-1 text-[10px] text-slate-500">
                    {
                      selectedProvider.vehicleName
                    }
                    {" • "}
                    Rs.{" "}
                    {
                      selectedProvider.quote
                    }
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/* ============================================================
   PROVIDER / DRIVER DASHBOARD
   ============================================================ */

function ProviderDashboard({
  user,
  logout,
}: {
  user: DemoUser;
  logout: () => void;
}) {
  const [
    shipment,
    setShipment,
  ] =
    useState<SharedShipment | null>(
      null
    );

  const [
    bidAmount,
    setBidAmount,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  /*
    Synchronize customer ↔ driver.
  */

  useEffect(() => {
    const sync =
      () => {
        const active =
          getActiveShipment();

        setShipment(
          active
        );

        if (
          active &&
          active.status ===
            "BIDDING"
        ) {
          const ownQuote =
            active.quotes.find(
              (quote) =>
                quote.rider ===
                user.name
            );

          if (
            ownQuote &&
            !bidAmount
          ) {
            setBidAmount(
              String(
                ownQuote.quote
              )
            );
          }
        }
      };

    sync();

    const interval =
      window.setInterval(
        sync,
        600
      );

    window.addEventListener(
      "storage",
      sync
    );

    window.addEventListener(
      SHIPMENT_EVENT,
      sync
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        "storage",
        sync
      );

      window.removeEventListener(
        SHIPMENT_EVENT,
        sync
      );
    };
  }, [
    user.name,
    bidAmount,
  ]);

  const assignedToMe =
    shipment?.selectedProvider
      ?.rider ===
    user.name;

  function submitBid() {
    if (
      !shipment ||
      shipment.status !==
        "BIDDING"
    ) {
      return;
    }

    const amount =
      Number(
        bidAmount
      );

    if (
      !amount ||
      amount <= 0
    ) {
      return;
    }

    const existing =
      shipment.quotes.find(
        (quote) =>
          quote.rider ===
          user.name
      );

    /*
      Demo driver corresponds to
      Ahmed Raza's provider profile.
    */

    const baseProvider =
      PROVIDERS.find(
        (provider) =>
          provider.rider ===
          user.name
      );

    if (!baseProvider) {
      return;
    }

    const quote:
      ProviderQuote = {
      ...baseProvider,

      quote:
        amount,
    };

    const updated =
      existing
        ? shipment.quotes.map(
            (item) =>
              item.rider ===
              user.name
                ? quote
                : item
          )
        : [
            ...shipment.quotes,
            quote,
          ];

    updateActiveShipment({
      quotes:
        updated,
    });

    setSuccessMessage(
      `Bid submitted at Rs. ${amount}. Waiting for customer acceptance.`
    );
  }

  function uploadPickupProof(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    if (
      !shipment ||
      !assignedToMe ||
      shipment.status !==
        "ARRIVED_PICKUP"
    ) {
      return;
    }

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const image =
        reader.result as string;

      updateActiveShipment({
        pickupProof:
          image,

        status:
          "PICKUP_VERIFIED",
      });

      setSuccessMessage(
        "Pickup proof recorded successfully."
      );
    };

    reader.readAsDataURL(
      file
    );
  }

  function startDelivery() {
    if (
      !shipment ||
      !assignedToMe ||
      shipment.status !==
        "PICKUP_VERIFIED" ||
      !shipment.pickupProof
    ) {
      return;
    }

    updateActiveShipment({
      status:
        "IN_TRANSIT",
    });

    setSuccessMessage(
      "Delivery started. Customer tracking is now live."
    );
  }

  function uploadDeliveryProof(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    if (
      !shipment ||
      !assignedToMe ||
      shipment.status !==
        "ARRIVED_DESTINATION"
    ) {
      return;
    }

    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      const image =
        reader.result as string;

      updateActiveShipment({
        deliveryProof:
          image,

        status:
          "DELIVERY_VERIFIED",
      });

      setSuccessMessage(
        "Delivery proof recorded."
      );
    };

    reader.readAsDataURL(
      file
    );
  }

  function completeTrip() {
    if (
      !shipment ||
      !assignedToMe ||
      shipment.status !==
        "DELIVERY_VERIFIED" ||
      !shipment.deliveryProof
    ) {
      return;
    }

    updateActiveShipment({
      status:
        "COMPLETED",
    });

    setSuccessMessage(
      "Trip completed successfully."
    );
  }

  return (
    <AppShell
      user={user}
      logout={logout}
      roleLabel="Transport Provider"
    >
      <Hero
        title="Your delivery workspace."
        description="Review shipment requests, submit bids, verify goods collection and complete assigned transportation jobs."
      />

      {!shipment && (
        <div className="mt-5">
          <Panel>
            <div className="py-12 text-center">
              <Truck
                size={34}
                className="mx-auto text-slate-300"
              />

              <p className="mt-4 text-lg font-black">
                No shipment requests
              </p>

              <p className="mt-2 text-sm text-slate-500">
                A customer must send
                a shipment for bids
                first.
              </p>
            </div>
          </Panel>
        </div>
      )}

      {shipment && (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_420px]">
          {/* ================================================
              DRIVER JOB INFO
              ================================================ */}

          <div className="space-y-5">
            <Panel>
              <PanelTitle
                icon={
                  <Truck
                    size={18}
                  />
                }
                eyebrow={`Shipment ${shipment.id}`}
                title="Transport request"
              />

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-lg font-black">
                  {
                    LOCATIONS[
                      shipment.pickup
                    ].name
                  }

                  <ArrowRight
                    size={15}
                    className="mx-2 inline text-violet-500"
                  />

                  {
                    LOCATIONS[
                      shipment.destination
                    ].name
                  }
                </p>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric
                    label="Goods"
                    value={
                      shipment.goodsType
                    }
                  />

                  <Metric
                    label="Weight"
                    value={`${shipment.weight} kg`}
                  />

                  <Metric
                    label="Mode"
                    value={
                      shipment.deliveryMode ===
                      "SHARED"
                        ? "Shared"
                        : "Direct"
                    }
                  />

                  <Metric
                    label="Status"
                    value={
                      driverStatusTitle(
                        shipment.status
                      )
                    }
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-100 p-4">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Package Notes
                </p>

                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {
                    shipment.description
                  }
                </p>
              </div>
            </Panel>

            {/* ================================================
                DRIVER BID

                No assignment happens here.
                ================================================ */}

            {shipment.status ===
              "BIDDING" && (
              <Panel>
                <PanelTitle
                  icon={
                    <Wallet
                      size={18}
                    />
                  }
                  eyebrow="Bidding"
                  title="Submit your transport quote"
                />

                <div className="mt-5">
                  <Label>
                    Your Bid
                  </Label>

                  <div className="input flex items-center">
                    <span className="mr-2 text-xs font-black">
                      Rs.
                    </span>

                    <input
                      type="number"
                      value={
                        bidAmount
                      }
                      onChange={(e) =>
                        setBidAmount(
                          e.target.value
                        )
                      }
                      className="flex-1 bg-transparent outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    submitBid
                  }
                  className="mt-4 w-full rounded-2xl bg-violet-600 py-3.5 text-sm font-black text-white"
                >
                  Submit / Update Bid
                </button>

                <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                  Submitting a bid does
                  not assign the job.
                  You must wait until
                  the customer accepts
                  your quote.
                </p>
              </Panel>
            )}

            {/* ================================================
                SOMEONE ELSE SELECTED
                ================================================ */}

            {shipment.selectedProvider &&
              !assignedToMe && (
                <Panel>
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-sm font-black">
                      Shipment assigned to
                      another provider
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      The customer selected{" "}
                      {
                        shipment.selectedProvider.rider
                      }
                      .
                    </p>
                  </div>
                </Panel>
              )}
          </div>

          {/* ================================================
              DRIVER WORKFLOW
              ================================================ */}

          <div className="space-y-5">
            {assignedToMe && (
              <Panel>
                <PanelTitle
                  icon={
                    <Navigation
                      size={18}
                    />
                  }
                  eyebrow="Assigned Job"
                  title={
                    driverStatusTitle(
                      shipment.status
                    )
                  }
                />

                {[
                  "BID_ACCEPTED",
                  "DRIVER_TO_PICKUP",
                ].includes(
                  shipment.status
                ) && (
                  <div className="mt-5 rounded-2xl bg-blue-50 p-4">
                    <p className="text-sm font-black text-blue-950">
                      Head to pickup
                    </p>

                    <p className="mt-2 text-xs leading-relaxed text-blue-700">
                      The customer's live
                      map is currently
                      showing your vehicle
                      approaching{" "}
                      {
                        LOCATIONS[
                          shipment.pickup
                        ].name
                      }
                      .
                    </p>

                    <p className="mt-3 text-[10px] font-bold text-blue-600">
                      Pickup proof will
                      become available only
                      after arrival.
                    </p>
                  </div>
                )}

                {/* ==========================================
                    PICKUP PROOF

                    ONLY AFTER ARRIVAL.
                    ========================================== */}

                {shipment.status ===
                  "ARRIVED_PICKUP" && (
                  <div className="mt-5">
                    <ProofUpload
                      title="Pickup Proof"
                      description="Collect the goods first, then photograph them to verify successful pickup."
                      image={
                        shipment.pickupProof
                      }
                      onChange={
                        uploadPickupProof
                      }
                    />
                  </div>
                )}

                {/* ==========================================
                    START DELIVERY

                    ONLY AFTER PICKUP PROOF.
                    ========================================== */}

                {shipment.status ===
                  "PICKUP_VERIFIED" && (
                  <div className="mt-5">
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <CheckCircle2
                        size={25}
                        className="text-emerald-600"
                      />

                      <p className="mt-3 text-sm font-black text-emerald-950">
                        Pickup verified
                      </p>

                      <p className="mt-1 text-xs text-emerald-700">
                        Goods collection has
                        been recorded. The
                        trip can now begin.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        startDelivery
                      }
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3.5 text-sm font-black text-white"
                    >
                      <Navigation
                        size={17}
                      />

                      Start Delivery
                    </button>
                  </div>
                )}

                {shipment.status ===
                  "IN_TRANSIT" && (
                  <div className="mt-5 rounded-2xl bg-violet-50 p-4">
                    <div className="flex items-center gap-2 text-violet-600">
                      <Truck
                        size={20}
                      />

                      <p className="text-sm font-black">
                        Delivery in progress
                      </p>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-violet-800">
                      Continue toward{" "}
                      {
                        LOCATIONS[
                          shipment.destination
                        ].name
                      }
                      . The customer can
                      see the live simulated
                      vehicle movement.
                    </p>
                  </div>
                )}

                {/* ==========================================
                    DELIVERY PROOF

                    ONLY AFTER DESTINATION ARRIVAL.
                    ========================================== */}

                {shipment.status ===
                  "ARRIVED_DESTINATION" && (
                  <div className="mt-5">
                    <ProofUpload
                      title="Delivery Proof"
                      description="Hand over the goods at the destination, then photograph them to verify delivery."
                      image={
                        shipment.deliveryProof
                      }
                      onChange={
                        uploadDeliveryProof
                      }
                    />
                  </div>
                )}

                {/* ==========================================
                    COMPLETE TRIP

                    ONLY AFTER DELIVERY PROOF.
                    ========================================== */}

                {shipment.status ===
                  "DELIVERY_VERIFIED" && (
                  <div className="mt-5">
                    <div className="rounded-2xl bg-emerald-50 p-4">
                      <PackageCheck
                        size={25}
                        className="text-emerald-600"
                      />

                      <p className="mt-3 text-sm font-black text-emerald-950">
                        Delivery verified
                      </p>

                      <p className="mt-1 text-xs text-emerald-700">
                        Proof of delivery
                        has been recorded.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        completeTrip
                      }
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white"
                    >
                      <CheckCircle2
                        size={17}
                      />

                      Complete Trip
                    </button>
                  </div>
                )}

                {shipment.status ===
                  "COMPLETED" && (
                  <div className="mt-5 rounded-2xl bg-emerald-50 p-5">
                    <CheckCircle2
                      size={30}
                      className="text-emerald-600"
                    />

                    <p className="mt-3 text-lg font-black text-emerald-950">
                      Job completed
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-emerald-700">
                      Pickup and delivery
                      evidence are recorded
                      and the trip has been
                      closed.
                    </p>
                  </div>
                )}
              </Panel>
            )}

            {successMessage && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700">
                {
                  successMessage
                }
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ============================================================
   QUOTE CARD
   ============================================================ */

function ProviderQuoteCard({
  provider,
  recommended,
  onAccept,
}: {
  provider:
    ProviderQuote;

  recommended:
    boolean;

  onAccept:
    () => void;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-4 transition ${
        recommended
          ? "border-violet-400 bg-violet-50/60 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      {recommended && (
        <span className="absolute right-3 top-3 rounded-full bg-violet-600 px-2 py-1 text-[7px] font-black text-white">
          RECOMMENDED
        </span>
      )}

      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Truck
            size={22}
          />
        </div>

        <div>
          <p className="text-sm font-black">
            {
              provider.rider
            }
          </p>

          <p className="text-[10px] text-slate-400">
            {
              provider.vehicleName
            }
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            <Badge>
              {vehicleLabel(
                provider.vehicleClass
              )}
            </Badge>

            <Badge>
              Max{" "}
              {
                provider.maxLoadKg
              }
              kg
            </Badge>

            {provider.sharedSupported && (
              <Badge green>
                Shared Ready
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat
          icon={
            <Star
              size={10}
            />
          }
          value={`${provider.rating}`}
        />

        <MiniStat
          icon={
            <Clock3
              size={10}
            />
          }
          value={`${provider.eta}m`}
        />

        <MiniStat
          icon={
            <MapPin
              size={10}
            />
          }
          value={`${provider.distanceAway}km`}
        />
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
            Provider Quote
          </p>

          <p className="mt-1 text-xl font-black">
            Rs.{" "}
            {
              provider.quote
            }
          </p>
        </div>

        <button
          type="button"
          onClick={
            onAccept
          }
          className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-black"
        >
          Accept Bid
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   UI
   ============================================================ */

function AppShell({
  user,
  logout,
  roleLabel,
  children,
}: {
  user: DemoUser;
  logout: () => void;
  roleLabel: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f5f6fa] text-[#151821]">
      <header className="sticky top-0 z-[1000] border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-4">
          <Brand />

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-black">
                {user.name}
              </p>

              <p className="text-[9px] text-slate-400">
                {roleLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={
                logout
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
            >
              <LogOut
                size={16}
              />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
        {children}
      </div>
    </main>
  );
}

function Brand({
  light = false,
}: {
  light?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
        <Truck
          size={22}
        />
      </div>

      <div>
        <p
          className={`text-lg font-black ${
            light
              ? "text-white"
              : "text-slate-950"
          }`}
        >
          TransitGo
        </p>

        <p
          className={`text-[8px] font-black uppercase tracking-[0.18em] ${
            light
              ? "text-violet-200"
              : "text-slate-400"
          }`}
        >
          Intelligent Logistics
        </p>
      </div>
    </div>
  );
}

function Hero({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] bg-slate-950 px-6 py-8 text-white sm:px-8">
      <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 text-violet-300">
          <Sparkles
            size={14}
          />

          <p className="text-[9px] font-black uppercase tracking-[0.2em]">
            TransitGo
          </p>
        </div>

        <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
          {title}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
    </section>
  );
}

function Panel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_8px_40px_rgba(15,23,42,.04)]">
      {children}
    </section>
  );
}

function PanelTitle({
  icon,
  eyebrow,
  title,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        {icon}
      </div>

      <div>
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-violet-500">
          {eyebrow}
        </p>

        <h3 className="text-lg font-black">
          {title}
        </h3>
      </div>
    </div>
  );
}

function Label({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <label className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
      {children}
    </label>
  );
}

function Choice({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`rounded-2xl border p-3 text-left transition ${
        active
          ? "border-violet-400 bg-violet-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div
        className={
          active
            ? "text-violet-600"
            : "text-slate-500"
        }
      >
        {icon}
      </div>

      <p className="mt-2 text-xs font-black">
        {title}
      </p>

      <p className="mt-1 text-[8px] text-slate-400">
        {subtitle}
      </p>
    </button>
  );
}

function LocationSelect({
  label,
  value,
  setValue,
}: {
  label: string;
  value: string;
  setValue: (
    value: string
  ) => void;
}) {
  return (
    <div>
      <Label>
        {label}
      </Label>

      <div className="input flex items-center">
        <MapPin
          size={14}
          className="mr-2 text-violet-500"
        />

        <select
          value={
            value
          }
          onChange={(e) =>
            setValue(
              e.target.value
            )
          }
          className="w-full bg-transparent outline-none"
        >
          {NODES.map(
            (node) => (
              <option
                key={
                  node
                }
                value={
                  node
                }
              >
                {
                  LOCATIONS[
                    node
                  ].name
                }
              </option>
            )
          )}
        </select>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-black">
        {value}
      </p>
    </div>
  );
}

function Badge({
  children,
  green = false,
}: {
  children: ReactNode;
  green?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[7px] font-black ${
        green
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

function MiniStat({
  icon,
  value,
}: {
  icon: ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-lg bg-slate-50 py-2 text-[9px] font-bold text-slate-600">
      {icon}

      {value}
    </div>
  );
}

function StatusIcon({
  status,
}: {
  status:
    ShipmentStatus;
}) {
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
        status ===
        "COMPLETED"
          ? "bg-emerald-100 text-emerald-600"
          : "bg-violet-50 text-violet-600"
      }`}
    >
      {status ===
      "COMPLETED" ? (
        <ShieldCheck
          size={21}
        />
      ) : (
        <Truck
          size={21}
        />
      )}
    </div>
  );
}

function ShipmentProgress({
  status,
}: {
  status:
    ShipmentStatus;
}) {
  const index =
    shipmentStatusIndex(
      status
    );

  const steps = [
    "Request",
    "Bid",
    "Pickup",
    "Transit",
    "Delivered",
  ];

  return (
    <div className="mt-5 grid grid-cols-5 gap-1">
      {steps.map(
        (
          step,
          stepIndex
        ) => (
          <div
            key={
              step
            }
          >
            <div
              className={`h-1.5 rounded-full ${
                stepIndex <=
                index
                  ? "bg-violet-600"
                  : "bg-slate-200"
              }`}
            />

            <p
              className={`mt-1 text-center text-[8px] font-bold ${
                stepIndex <=
                index
                  ? "text-violet-600"
                  : "text-slate-400"
              }`}
            >
              {step}
            </p>
          </div>
        )
      )}
    </div>
  );
}

function shipmentStatusIndex(
  status:
    ShipmentStatus
) {
  switch (status) {
    case "DRAFT":
    case "ANALYZING":
      return 0;

    case "BIDDING":
    case "BID_ACCEPTED":
    case "DRIVER_TO_PICKUP":
      return 1;

    case "ARRIVED_PICKUP":
    case "PICKUP_VERIFIED":
      return 2;

    case "IN_TRANSIT":
    case "ARRIVED_DESTINATION":
      return 3;

    case "DELIVERY_VERIFIED":
    case "COMPLETED":
      return 4;
  }
}

function customerStatusTitle(
  status:
    ShipmentStatus
) {
  switch (status) {
    case "DRAFT":
      return "Ready to Ship";

    case "ANALYZING":
      return "Preparing Quotes";

    case "BIDDING":
      return "Quotes Available";

    case "BID_ACCEPTED":
      return "Provider Assigned";

    case "DRIVER_TO_PICKUP":
      return "Driver Approaching";

    case "ARRIVED_PICKUP":
      return "Driver at Pickup";

    case "PICKUP_VERIFIED":
      return "Pickup Verified";

    case "IN_TRANSIT":
      return "In Transit";

    case "ARRIVED_DESTINATION":
      return "Driver at Destination";

    case "DELIVERY_VERIFIED":
      return "Delivery Verified";

    case "COMPLETED":
      return "Completed";
  }
}

function driverStatusTitle(
  status:
    ShipmentStatus
) {
  switch (status) {
    case "DRAFT":
      return "Draft";

    case "ANALYZING":
      return "Preparing";

    case "BIDDING":
      return "Open for Bids";

    case "BID_ACCEPTED":
      return "Bid Accepted";

    case "DRIVER_TO_PICKUP":
      return "Go to Pickup";

    case "ARRIVED_PICKUP":
      return "Collect Goods";

    case "PICKUP_VERIFIED":
      return "Pickup Verified";

    case "IN_TRANSIT":
      return "Delivery Active";

    case "ARRIVED_DESTINATION":
      return "At Destination";

    case "DELIVERY_VERIFIED":
      return "Delivery Verified";

    case "COMPLETED":
      return "Completed";
  }
}

function mapStatusText(
  status:
    ShipmentStatus
) {
  switch (status) {
    case "DRIVER_TO_PICKUP":
      return "Driver approaching pickup";

    case "ARRIVED_PICKUP":
      return "Driver at pickup";

    case "PICKUP_VERIFIED":
      return "Pickup verified";

    case "IN_TRANSIT":
      return "Shipment in transit";

    case "ARRIVED_DESTINATION":
      return "Driver at destination";

    case "DELIVERY_VERIFIED":
      return "Delivery verified";

    case "COMPLETED":
      return "Trip completed";

    default:
      return "TransitGo vehicle";
  }
}

function ProofUpload({
  title,
  description,
  image,
  onChange,
  disabled = false,
}: {
  title: string;
  description: string;
  image: string | null;
  onChange: (
    event:
      ChangeEvent<HTMLInputElement>
  ) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-black">
        {title}
      </p>

      <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
        {description}
      </p>

      {image ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-emerald-200">
          <img
            src={image}
            alt={
              title
            }
            className="h-44 w-full object-cover"
          />

          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">
            <Check
              size={12}
            />

            Evidence recorded
          </div>
        </div>
      ) : (
        <label
          className={`mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
            disabled
              ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-50"
              : "cursor-pointer border-slate-200 bg-slate-50 hover:border-violet-300"
          }`}
        >
          <ImagePlus
            size={25}
            className="text-violet-500"
          />

          <p className="mt-2 text-xs font-black">
            Upload Photo
          </p>

          <p className="mt-1 text-[9px] text-slate-400">
            Camera, JPG or PNG
          </p>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={
              disabled
            }
            onChange={
              onChange
            }
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

function AuthInput({
  label,
  value,
  setValue,
  type = "text",
}: {
  label: string;
  value: string;
  setValue: (
    value: string
  ) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-slate-400">
        {label}
      </label>

      <input
        type={
          type
        }
        value={
          value
        }
        onChange={(e) =>
          setValue(
            e.target.value
          )
        }
        className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm text-white outline-none focus:border-violet-500"
      />
    </div>
  );
}

function DarkFeature({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm font-black">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {text}
      </p>
    </div>
  );
}

function DemoAccount({
  title,
  email,
  onClick,
}: {
  title: string;
  email: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-left transition hover:border-violet-800"
    >
      <p className="text-[9px] font-black uppercase tracking-wider text-violet-400">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-300">
        {email}
      </p>

      <p className="text-[10px] text-slate-500">
        Password: 123456
      </p>
    </button>
  );
}
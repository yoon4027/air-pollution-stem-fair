"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SensorPageSkeleton } from "@/components/ui/deviceSkeleton";
import { Progress } from "@/components/ui/progress";
import RealtimeIndicator from "@/components/ui/realTime";
import {
  Tooltip as CToolTip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toTitleCase } from "@/lib/utils";
import { Device, Readings, WsResponse } from "@/models/sensor";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Atom,
  AudioLines,
  Clock,
  Gauge,
  MapIcon,
  Thermometer,
  Wind,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const StreetMap = dynamic(() => import("@/components/ui/singleMap"), {
  ssr: false,
});

const getAirQualityStatus = (pm25: number) => {
  if (pm25 <= 12) return { status: "Good", color: "text-green-600" };
  if (pm25 <= 35.4) return { status: "Moderate", color: "text-yellow-600" };
  if (pm25 <= 55.4) return { status: "Sensitive", color: "text-orange-600" };
  if (pm25 <= 150.4) return { status: "Unhealthy", color: "text-red-600" };
  if (pm25 <= 250.4)
    return { status: "Very Unhealthy", color: "text-brown-600" };

  return { status: "Hazardous", color: "text-red-600" };
};

const SensorGraph = ({
  title,
  data,
  dataKeys,
  colors,
  icon: Icon,
}: {
  title: string;
  data: any[];
  dataKeys: string[];
  colors: string[];
  icon: React.ElementType;
}) => {
  const mappedData = data.map((v) => {
    return {
      ...v,
      created_at: format(v.created_at, "dd/MM HH:mm"),
    };
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex space-x-2">
          <Icon></Icon>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={mappedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="created_at"
                interval="preserveStartEnd"
                angle={-45}
                textAnchor="end"
                height={60}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index]}
                  name={key}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

const getStatusColor = (
  value: number,
  ranges?: { good: number; moderate: number }
) => {
  if (!ranges) return "bg-primary";
  if (value <= ranges.good) return "bg-green-500";
  if (value <= ranges.moderate) return "bg-yellow-500";
  return "bg-red-500";
};

const getStatusText = (
  value: number,
  ranges?: { good: number; moderate: number }
) => {
  if (!ranges) return "N/A";
  if (value <= ranges.good) return "Good";
  if (value <= ranges.moderate) return "Moderate";
  return "Poor";
};

const ReadingCard = ({
  title,
  value,
  unit,
  icon: Icon,
  ranges,
}: {
  title: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  ranges?: {
    good: number;
    moderate: number;
    poor: number;
  };
}) => {
  const wrappedValue = Number(value);

  const statusColor = getStatusColor(wrappedValue, ranges);
  const statusText = getStatusText(wrappedValue, ranges);
  const progressValue = ranges
    ? (Number(value) / (ranges.moderate * 2)) * 100
    : 0;

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <Icon className="h-5 w-5 text-muted-foreground mr-2" />
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
          </div>
          {ranges && (
            <TooltipProvider>
              <CToolTip>
                <TooltipTrigger>
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor} text-white`}
                  >
                    {statusText}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Good: ≤ {ranges.good} {unit}
                  </p>
                  <p>
                    Moderate: ≤ {ranges.moderate} {unit}
                  </p>
                  <p>
                    Poor: &gt; {ranges.poor} {unit}
                  </p>
                </TooltipContent>
              </CToolTip>
            </TooltipProvider>
          )}
        </div>
        <div className="text-3xl font-bold mb-2">
          {wrappedValue.toFixed(2)} {unit}
        </div>
        {ranges && (
          <Progress
            value={progressValue}
            className="h-2"
            //indicatorClassName={statusColor}
          />
        )}
      </CardContent>
    </Card>
  );
};

const StatusIndicator = ({ isOffline }: { isOffline: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.5, ease: "easeInOut" }}
    className="text-center mb-6"
  >
    <motion.span
      initial={{ backgroundColor: isOffline ? "#f87171" : "#10b981" }}
      animate={{ backgroundColor: isOffline ? "#f87171" : "#10b981" }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center px-4 py-2 rounded-full text-white text-sm font-medium"
    >
      <Clock className="w-4 h-4 mr-2" />
      {isOffline
        ? "Sensor Offline - Displaying Latest Data"
        : "Sensor Online - Real-time Data"}
    </motion.span>
  </motion.div>
);

const PMDataSection = ({ readings }: { readings: Readings }) => {
  const pmCategories = [
    { label: "PM1.0", value: readings.pm_10 ?? 0 },
    { label: "PM2.5", value: readings.pm_25 ?? 0 },
    { label: "PM10", value: readings.pm_100 ?? 0 },
  ];

  const particleCategories = [
    { label: "0.3µm", value: readings.pm_particles_03 },
    { label: "0.5µm", value: readings.pm_particles_05 },
    { label: "1.0µm", value: readings.pm_particles_10 },
    { label: "2.5µm", value: readings.pm_particles_25 },
    { label: "5.0µm", value: readings.pm_particles_50 },
    { label: "10.0µm", value: readings.pm_particles_100 },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center">
          <Wind className="mr-2 h-5 w-5" />
          Particulate Matter (PM) Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">
              PM Concentrations (µg/m³)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {pmCategories.map((category) => (
                <PMConcentrationItem
                  key={category.label}
                  label={category.label}
                  value={category.value}
                />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">
              Particle Counts (per 0.1L)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {particleCategories.map((category) => (
                <ParticleCountItem
                  key={category.label}
                  label={category.label}
                  value={category.value}
                />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PMConcentrationItem = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div className="bg-secondary rounded-lg p-3">
    <div className="text-sm font-medium mb-1">{label}</div>
    <div className="text-lg font-bold">{value?.toFixed(2) ?? "N/A"}</div>
  </div>
);

const ParticleCountItem = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div className="bg-secondary rounded-lg p-3">
    <div className="text-sm font-medium mb-1">{label}</div>
    <div className="text-lg font-bold">{value?.toLocaleString() ?? "N/A"}</div>
  </div>
);

function Metadata({ device }: { device: Device }) {
  return (
    <>
      <meta name="title" content={`${toTitleCase(device.name)} | yoon.dev`} />
      <meta
        name="description"
        content={`Air quality detail for ${device.name}`}
      />
      <meta name="author" content="yoon" />
      <meta
        name="keywords"
        content={`Air Quality Maldives, Air Quality for ${device.name}, ${device.name} air quality`}
      />
      <meta
        name="og:title"
        content={`${toTitleCase(device.name)} | yoon.dev`}
      />
      <meta name="og:type" content="website" />
      <meta
        name="og:url"
        content={`https://air.yoon.dev/devices/${device.id}`}
      />
      <meta
        name="og:description"
        content={`Air quality detail for ${device.name}`}
      />
      <link
        rel="alternate"
        href={`https://air.yoon.dev/devices/${device.id}`}
      />
      <link
        rel="canonical"
        href={`https://air.yoon.dev/devices/${device.id}`}
      />
    </>
  );
}

export default function SensorDetails({ params }: { params: { id: string } }) {
  const [device, setDevice] = useState<Device | null>(null);
  const [readings, setReading] = useState<Readings | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [deviceStatus, setDeviceStatus] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<"24H" | "7D">("24H");

  const wsRef = useRef<WebSocket | null>(null);

  const fetchHistoricalData = async () => {
    try {
      const response = await fetch(
        `https://web-serv.yoon.dev/devices/${params.id}/readings?select=${timeRange}`
      );
      const data = await response.json();
      setHistoricalData(data.data);
    } catch (error) {
      console.error("Error fetching historical data:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deviceRes, readingsRes] = await Promise.all([
          fetch(`https://web-serv.yoon.dev/devices/${params.id}`),
          fetch(
            `https://web-serv.yoon.dev/devices/${params.id}/readings?select=Last`
          ),
        ]);

        const deviceData = await deviceRes.json();
        const readingsData = await readingsRes.json();

        setDevice(deviceData.data);
        setDeviceStatus(deviceData.data.active);

        setLastUpdated(new Date(readingsData?.data?.updated_at));
        delete readingsData.data.updated_at;
        setReading(readingsData?.data);

        await fetchHistoricalData();

        setIsInitialized(true);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();

    wsRef.current = new WebSocket("wss://web-serv.yoon.dev/ws");

    wsRef.current.onopen = () => {
      console.log("Connected to websocket");
      wsRef.current?.send(
        JSON.stringify({
          type: "identify",
          data: {
            type: "child",
            id: params.id,
          },
        })
      );
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data) as WsResponse;

      if (data.type === "data") {
        setReading((prevReading) => {
          if (JSON.stringify(prevReading) !== JSON.stringify(data.data.data)) {
            return data.data.data;
          }
          return prevReading;
        });
        setDeviceStatus(true);
        setLastUpdated(new Date());
      }

      if (data.type === "device_active") {
        setDeviceStatus(data.data.active);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    wsRef.current.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [params.id]);

  useEffect(() => {
    fetchHistoricalData();
  }, [timeRange]);

  if (!device) {
    return <SensorPageSkeleton />;
  }

  return (
    <>
      <Metadata device={device} />
      <AnimatePresence mode="wait">
        {!isInitialized ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SensorPageSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="min-h-screen bg-background p-4 md:p-8"
          >
            <motion.h1
              className="text-3xl font-bold mb-6 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {device.name.toUpperCase()}
            </motion.h1>
            <AnimatePresence mode="wait">
              <StatusIndicator
                key={deviceStatus ? "online" : "offline"}
                isOffline={!deviceStatus}
              />
            </AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <ReadingCard
                  title="CO2"
                  value={readings?.co2?.toFixed(2) ?? "0.00"}
                  unit="ppm"
                  icon={Gauge}
                  ranges={{
                    good: 700,
                    moderate: 1000,
                    poor: 2000,
                  }}
                />
                <ReadingCard
                  title="CO"
                  value={readings?.co?.toFixed(2) ?? "0.00"}
                  unit="ppm"
                  icon={Gauge}
                  ranges={{
                    good: 50,
                    moderate: 51,
                    poor: 100,
                  }}
                />
                <ReadingCard
                  title="Noise"
                  value={readings?.noise.toFixed(2) ?? "0.00"}
                  unit="dB"
                  icon={AudioLines}
                  ranges={{ good: 70, moderate: 80, poor: 90 }}
                />
                <ReadingCard
                  title="Temperature"
                  value={readings?.temperature?.toFixed(2) ?? "0.00"}
                  unit="°C"
                  icon={Thermometer}
                />
                <ReadingCard
                  title="Humidity"
                  value={readings?.humidity?.toFixed(2) ?? "0.00"}
                  unit="%"
                  icon={Wind}
                />
              </div>
              {readings && <PMDataSection readings={readings} />}
              <div className="flex justify-center space-x-4 mt-6">
                <Button
                  onClick={() => setTimeRange("24H")}
                  variant={timeRange === "24H" ? "default" : "outline"}
                >
                  Last 24 Hours
                </Button>
                <Button
                  onClick={() => setTimeRange("7D")}
                  variant={timeRange === "7D" ? "default" : "outline"}
                >
                  Last 7 Days
                </Button>
              </div>
              <SensorGraph
                title="PM Levels (µg/m³)"
                data={historicalData}
                dataKeys={["pm_10", "pm_25", "pm_100"]}
                colors={["#8884d8", "#82ca9d", "#ffc658"]}
                icon={Gauge}
              />
              <SensorGraph
                title="Particle Counts / 0.1L"
                data={historicalData}
                dataKeys={[
                  "pm_particles_03",
                  "pm_particles_05",
                  "pm_particles_10",
                  "pm_particles_25",
                  "pm_particles_50",
                  "pm_particles_100",
                ]}
                colors={[
                  "#8884d8",
                  "#82ca9d",
                  "#ffc658",
                  "#ff8042",
                  "#00C49F",
                  "#FFBB28",
                ]}
                icon={Atom}
              />
              <SensorGraph
                title="Gases (ppm)"
                data={historicalData}
                dataKeys={["co", "co2"]}
                colors={["#8884d8", "#82ca9d"]}
                icon={Gauge}
              />

              <SensorGraph
                title="Noise Levels (dB)"
                data={historicalData}
                dataKeys={["noise"]}
                colors={["#8884d8"]}
                icon={AudioLines}
              />

              {historicalData.some(
                (d) => d.temperature === 0 && d.humidity === 0
              ) && (
                <SensorGraph
                  title="Ambient Climate"
                  data={historicalData}
                  dataKeys={["temperature", "humidity"]}
                  colors={["#8884d8", "#82ca9d"]}
                  icon={Thermometer}
                />
              )}

              <Card>
                <CardHeader>
                  <div className="flex space-x-2">
                    <MapIcon />
                    <CardTitle>Sensor Location</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[400px]">
                    <StreetMap
                      device={device}
                      center={[device.long, device.lat]}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="mt-6 text-center">
                <Link href="/">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Overview
                  </Button>
                </Link>
              </div>
            </motion.div>
            <RealtimeIndicator
              isOffline={!deviceStatus}
              lastUpdated={lastUpdated}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

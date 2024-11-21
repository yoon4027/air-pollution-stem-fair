"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MainPageSkeleton } from "@/components/ui/mainSkeleton";
import RealtimeIndicator from "@/components/ui/realTime";
import { cn } from "@/lib/utils";
import type { Device, Readings, Sensor, WsResponse } from "@/models/sensor";
import { AnimatePresence, motion } from "framer-motion";
import { Gauge, Loader2, MapIcon, PowerOff, Wind } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const StreetMap = dynamic(() => import("@/components/ui/map"), { ssr: false });

const getAirQualityStatus = (pm25: number) => {
  if (pm25 <= 12) return { status: "Good", color: "text-green-600" };
  if (pm25 <= 35.4) return { status: "Moderate", color: "text-yellow-600" };
  if (pm25 <= 55.4) return { status: "Sensitive", color: "text-orange-600" };
  if (pm25 <= 150.4) return { status: "Unhealthy", color: "text-red-600" };
  if (pm25 <= 250.4)
    return { status: "Very Unhealthy", color: "text-brown-600" };

  return { status: "Hazardous", color: "text-red-600" };
};

const DeviceReadings = ({
  sensor,
  device,
  isOffline,
}: {
  sensor: Readings;
  device: Device;
  isOffline: boolean;
}) => {
  const { status, color } = getAirQualityStatus(sensor.pm_25);

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={{
        opacity: isOffline ? 0.5 : 1,
        scale: isOffline ? 0.98 : 1,
      }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      className="w-full max-w-md"
    >
      <Link href={`/devices/${device.id}`} className="block">
        <Card className="overflow-hidden w-full h-full transition-all duration-300 hover:shadow-lg">
          <motion.div
            initial={{ backgroundColor: "var(--card)" }}
            whileHover={{ backgroundColor: "var(--primary)" }}
            transition={{ duration: 0.3 }}
          >
            <CardHeader className="p-4">
              <motion.div
                className="flex justify-between items-center"
                layout
                transition={{ duration: 0.3 }}
              >
                <CardTitle className="text-lg">
                  {device.name.toUpperCase()}
                </CardTitle>
                <AnimatePresence mode="wait">
                  {isOffline && (
                    <motion.span
                      key="offline"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-normal text-muted-foreground flex items-center ml-2 whitespace-nowrap overflow-hidden"
                    >
                      <PowerOff className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="flex-shrink-0">Offline</span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </CardHeader>
          </motion.div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Gauge className={cn("w-5 h-5", color)} />
                <div>
                  <div className="text-sm font-medium">Air Quality</div>
                  <div className={cn("text-sm font-bold", color)}>{status}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Wind className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">PM2.5</div>
                  <div className="text-sm font-bold">
                    {sensor.pm_25.toFixed(2) ?? "0.00"} µg/m³
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Gauge className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="text-sm font-medium">CO</div>
                  <div className="text-sm font-bold">
                    {sensor.co.toFixed(2) ?? "0.00"} ppm
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Gauge className="w-5 h-5 text-[#D3D3D3]-600" />
                <div>
                  <div className="text-sm font-medium">CO2</div>
                  <div className="text-sm font-bold">
                    {sensor.co2?.toFixed(2) ?? "0.00"} ppm
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

const AIMessage = ({
  message,
  isLoading,
}: {
  message: string;
  isLoading: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="w-full max-w-4xl mx-auto mt-4 mb-8"
  >
    <Card className="bg-secondary/50 backdrop-blur-sm border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center space-x-2"
            >
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <p className="text-sm font-medium text-secondary-foreground">
                Analyzing air quality data...
              </p>
            </motion.div>
          ) : (
            <motion.p
              key="message"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-sm font-medium text-center text-secondary-foreground"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  </motion.div>
);

export default function Home() {
  const [devices, setDevices] = useState<Map<string, Device>>(new Map());
  const [sensorData, setSensorData] = useState<Map<string, Readings>>(
    new Map()
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceStatus, setDeviceActive] = useState<Map<string, boolean>>(
    new Map()
  );

  let wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const makeFetch = async () => {
      const [devicesReq, lastReadingReq] = await Promise.all([
        fetch("https://web-serv.yoon.dev/devices"),
        fetch("https://web-serv.yoon.dev/devices_last_reading"),
      ]);

      const devices = await devicesReq.json();
      const lastReading = await lastReadingReq.json();

      const newDevices = new Map<string, Device>();
      const newDeviceStatus = new Map<string, boolean>();
      const newSensorData = new Map<string, Readings>();

      void devices.data.map((d: Device) => {
        newDevices.set(d.id, d as Device);
        newDeviceStatus.set(d.id, d.active);
      });

      void lastReading.data.forEach((r: Sensor) => {
        const id = r.id;
        const { id: _, ...readings } = r;
        newSensorData.set(id, readings as Readings);
      });

      setDevices(newDevices);
      setDeviceActive(newDeviceStatus);
      setSensorData(newSensorData);

      setIsInitialized(true);
    };

    makeFetch();

    wsRef.current = new WebSocket("wss://web-serv.yoon.dev/ws");

    wsRef.current.onopen = () => {
      console.log("Connected to websocket");

      wsRef?.current?.send(
        JSON.stringify({
          type: "identify",
          data: {
            type: "main",
          },
        })
      );
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data) as WsResponse;

      if (data.type === "data") {
        if (sensorData.get(data.data.id) !== data.data.data) {
          setSensorData((prev) => {
            const newSensorData = new Map(prev);
            newSensorData.set(data.data.id, data.data.data as Readings);
            return newSensorData;
          });

          setDeviceActive((prev) => prev.set(data.data.id, true));
        }
      }

      if (data.type === "keep_alive") {
        console.log("Handled keep alive");
        return;
      }

      if (data.type === "device_active") {
        setDeviceActive((prev) => {
          const newData = new Map(prev);
          newData.set(data.data.id, data.data.active);

          return newData;
        });
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
  }, []);

  const deviceEntries = Array.from(devices.entries());

  const gridClassName = cn(
    "grid gap-4 max-w-7xl mx-auto",
    "grid-cols-1 sm:grid-cols-2 justify-items-center"
  );

  return (
    <AnimatePresence mode="wait">
      {!isInitialized ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <MainPageSkeleton />
        </motion.div>
      ) : (
        <div className="min-h-screen bg-background p-4 md:p-8 transition-colors duration-300 ease-in-out">
          {/* <div className="fixed inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 pointer-events-none" /> */}
          <motion.h1
            className="text-3xl font-bold mb-6 text-center"
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            Air Quality Monitor
          </motion.h1>
          <div className="gap-4 max-w-7xl mx-auto grid-cols-1 sm:grid-cols-2 flex justify-center items-center">
            <AnimatePresence>
              {deviceEntries?.map(([deviceId, device]) => {
                const readings = sensorData?.get(deviceId) ?? {
                  co: 0,
                  co2: 0,
                  temperature: 0,
                  humidity: 0,
                  noise: 0,
                  pm_10: 0,
                  pm_25: 0,
                  pm_100: 0,
                  pm_particles_03: 0,
                  pm_particles_05: 0,
                  pm_particles_10: 0,
                  pm_particles_25: 0,
                  pm_particles_50: 0,
                  pm_particles_100: 0,
                };

                const isOffline = !deviceStatus.get(deviceId);

                return (
                  <motion.div
                    key={deviceId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className={cn(
                      "w-full",
                      deviceEntries.length <= 2 ? "sm:col-span-1" : ""
                    )}
                  >
                    <DeviceReadings
                      sensor={readings}
                      device={device}
                      isOffline={isOffline}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          <motion.div
            className="mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex space-x-2">
                  <MapIcon />
                  <CardTitle>Sensor Locations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px]">
                  <StreetMap readings={sensorData} devices={devices} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <RealtimeIndicator isOffline={false} lastUpdated={null} />
          {/* <AIMessage isLoading={false} message="Morning"></AIMessage> */}
        </div>
      )}
    </AnimatePresence>
  );
}

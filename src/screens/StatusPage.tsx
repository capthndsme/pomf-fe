import { useAvailableServers } from "@/hooks/useAvailableServers";
import type ServerShard from "types/response/ServerShard";

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { BRANDING } from "@/constants";
import { Chart, type AxisOptions } from "react-charts";

type AggregatedStatus = {
   totalSpaceFree: number;
   totalSpaceTotal: number;
   totalBwIn: number;
   totalBwOut: number;
   totalMemoryFree: number;
   totalMemoryTotal: number;
   avgCpuUse: number;
   time: Date;
};

type PerNodeData = {
   nodeId: number;
   domain: string;
   cpu: number;
   bwIn: number;
   bwOut: number;
   time: Date;
};

type ChartDataPoint = {
   primary: Date;
   secondary: number;
};

type ChartSeries = {
   label: string;
   data: ChartDataPoint[];
};

const StatusPage = () => {
   const serversProvider = useAvailableServers();

   useEffect(() => {
      // auto update every 30s
      const interval = setInterval(() => {
         serversProvider.refetch();
      }, 30000);
      return () => clearInterval(interval);
   }, []);

   return (
      <div className="w-full max-w-5xl mx-auto p-2 pt-20 pb-12">
         <Helmet>
            <title>{BRANDING} - Status Page</title>
         </Helmet>
         <AggregatedStatus server={serversProvider.data ?? []} />

         <h1 className="mt-8 text-2xl font-bold mb-4">Individual Node Status</h1>
         <div className="bg-blue-950 rounded-lg p-4 text-white">
            {serversProvider.isLoading && <p>Loading server status...</p>}
            {serversProvider.isError && <p>Error loading server status.</p>}
            {serversProvider.data && (
               <div className="overflow-x-auto">
                  <table className="w-full text-left table-auto min-w-[1200px] scroll-">
                     <thead>
                        <tr>
                           <th className="px-4 py-2">Domain</th>
                           <th className="px-4 py-2">Space Free</th>
                           <th className="px-4 py-2">Space Total</th>
                           <th className="px-4 py-2">Download</th>
                           <th className="px-4 py-2">Upload</th>
                           <th className="px-4 py-2">CPU%</th>
                           <th className="px-4 py-2">Mem Free</th>
                           <th className="px-4 py-2">Mem Total</th>
                           <th className="px-4 py-2">Last updated</th>
                        </tr>
                     </thead>
                     <tbody>
                        {serversProvider.data.map((server) => (
                           <RenderServerItem key={server.id} server={server} />
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>
      </div>
   );
};

const RenderServerItem = ({ server }: { server: ServerShard }) => {
   const distanceDate = (date: string) => {
      const ts = new Date(date);
      const diffSeconds = Math.floor((Date.now() - ts.getTime()) / 1000);

      if (diffSeconds < 5) {
         return "Now ✅";
      }
      if (diffSeconds > 180) {
         return `${diffSeconds}s+ ago ⚠️`;
      }
      return `${diffSeconds}s ago ✅`;
   };

   return (
      <tr key={server.id} className="border-t border-blue-800">
         <td className="px-4 py-2">{server.domain}</td>
         <td className="px-4 py-2">{((server.spaceFree ?? 0) / 1024 / 1024).toFixed(2)} GiB</td>
         <td className="px-4 py-2">{((server.spaceTotal ?? 0) / 1024 / 1024).toFixed(2)} GiB</td>
         <td className="px-4 py-2">{((server.bwIn ?? 0) / 1024 / 1024).toFixed(2)} Mbps</td>
         <td className="px-4 py-2">{((server.bwOut ?? 0) / 1024 / 1024).toFixed(2)} Mbps</td>
         <td className="px-4 py-2">{((server.cpuUse ?? 0) / 100).toFixed(2)}%</td>
         <td className="px-4 py-2">{((server.memoryFree ?? 0) / 1024 / 1024 / 1024).toFixed(2)} GB</td>
         <td className="px-4 py-2">{((server.memoryTotal ?? 0) / 1024 / 1024 / 1024).toFixed(2)} GB</td>
         <td className="px-2 py-2">{distanceDate(server.lastHeartbeat)}</td>
      </tr>
   );
};

const AggregatedStatus = ({ server }: { server: ServerShard[] }) => {
   const [history, setHistory] = useState<AggregatedStatus[]>([]);
   const [perNodeHistory, setPerNodeHistory] = useState<PerNodeData[]>([]);

   useEffect(() => {
      if (!server.length) return;

      const aggregated = {
         totalSpaceFree: server.reduce((acc, s) => acc + (s.spaceFree ?? 0), 0),
         totalSpaceTotal: server.reduce((acc, s) => acc + (s.spaceTotal ?? 0), 0),
         totalBwIn: server.reduce((acc, s) => acc + (s.bwIn ?? 0), 0),
         totalBwOut: server.reduce((acc, s) => acc + (s.bwOut ?? 0), 0),
         totalMemoryFree: server.reduce((acc, s) => acc + (s.memoryFree ?? 0), 0),
         totalMemoryTotal: server.reduce((acc, s) => acc + (s.memoryTotal ?? 0), 0),
         avgCpuUse: server.reduce((acc, s) => acc + (s.cpuUse ?? 0), 0) / server.length,
         time: new Date(),
      };

      // Store per-node data for individual node charts
      const perNodeData: PerNodeData[] = server.map(s => ({
         nodeId: s.id,
         domain: s.domain,
         cpu: s.cpuUse ?? 0,
         bwIn: s.bwIn ?? 0,
         bwOut: s.bwOut ?? 0,
         time: new Date(),
      }));

      // Keep only last 50 data points to prevent memory issues
      setHistory((prev) => {
         const updated = [...prev, aggregated];
         return updated.slice(-50);
      });

      setPerNodeHistory((prev) => {
         const updated = [...prev, ...perNodeData];
         return updated.slice(-50 * server.length); // Keep last 50 entries per node
      });
   }, [server]);

   const latest = history.at(-1);

   // Hard Drive Usage Chart (0-100% with GB legend)
   const hardDriveChart: ChartSeries[] = useMemo(
      () => [
         {
            label: `Hard Drive Used (${(((latest?.totalSpaceTotal ?? 0) - (latest?.totalSpaceFree ?? 0)) / 1024 / 1024 / 1024).toFixed(1)} GB used)`,
            data: history.map((d) => ({
               primary: d.time,
               secondary: ((d.totalSpaceTotal - d.totalSpaceFree) / d.totalSpaceTotal) * 100, // Percentage
            })),
         },
      ],
      [history, latest]
   );

   // Network In/Out Chart (Mbps)
   const networkChart: ChartSeries[] = useMemo(
      () => [
         {
            label: "Network In (Mbps)",
            data: history.map((d) => ({
               primary: d.time,
               secondary: d.totalBwIn / 1024 / 1024, // Convert to Mbps
            })),
         },
         {
            label: "Network Out (Mbps)",
            data: history.map((d) => ({
               primary: d.time,
               secondary: d.totalBwOut / 1024 / 1024, // Convert to Mbps
            })),
         },
      ],
      [history]
   );

   // CPU per-node + average
   const cpuChart: ChartSeries[] = useMemo(() => {
      const nodeData = new Map<number, ChartDataPoint[]>();

      // Group per-node data by node ID
      perNodeHistory.forEach(entry => {
         if (!nodeData.has(entry.nodeId)) {
            nodeData.set(entry.nodeId, []);
         }
         nodeData.get(entry.nodeId)!.push({
            primary: entry.time,
            secondary: entry.cpu / 100, // Convert to percentage
         });
      });

      const series: ChartSeries[] = [];

      // Add individual node series
      nodeData.forEach((data, nodeId) => {
         const node = server.find(s => s.id === nodeId);
         const domain = node?.domain || nodeId;
         series.push({
            label: `${domain} CPU`,
            data: data,
         });
      });

      // Add average CPU
      series.push({
         label: "Average CPU",
         data: history.map((d) => ({
            primary: d.time,
            secondary: d.avgCpuUse / 100, // Convert to percentage
         })),
      });

      return series;
   }, [perNodeHistory, history, server]);

   // Bandwidth per-node with dedicated averages
   const bandwidthChart: ChartSeries[] = useMemo(() => {
      const nodeInData = new Map<number, ChartDataPoint[]>();
      const nodeOutData = new Map<number, ChartDataPoint[]>();

      // Group per-node data by node ID
      perNodeHistory.forEach(entry => {
         if (!nodeInData.has(entry.nodeId)) {
            nodeInData.set(entry.nodeId, []);
            nodeOutData.set(entry.nodeId, []);
         }
         nodeInData.get(entry.nodeId)!.push({
            primary: entry.time,
            secondary: entry.bwIn / 1024 / 1024, // Convert to Mbps
         });
         nodeOutData.get(entry.nodeId)!.push({
            primary: entry.time,
            secondary: entry.bwOut / 1024 / 1024, // Convert to Mbps
         });
      });

      const series: ChartSeries[] = [];

      // Add individual node series
      nodeInData.forEach((data, nodeId) => {
         const node = server.find(s => s.id === nodeId);
         const domain = node?.domain || nodeId;
         series.push({
            label: `${domain} In`,
            data: data,
         });
      });

      nodeOutData.forEach((data, nodeId) => {
         const node = server.find(s => s.id === nodeId);
         const domain = node?.domain || nodeId;
         series.push({
            label: `${domain} Out`,
            data: data,
         });
      });

      // Add average bandwidth in and out
      series.push({
         label: "Average In",
         data: history.map((d) => ({
            primary: d.time,
            secondary: d.totalBwIn / server.length / 1024 / 1024, // Average per node in Mbps
         })),
      });

      series.push({
         label: "Average Out",
         data: history.map((d) => ({
            primary: d.time,
            secondary: d.totalBwOut / server.length / 1024 / 1024, // Average per node in Mbps
         })),
      });

      return series;
   }, [perNodeHistory, history, server]);

   const primaryAxis = useMemo(
      (): AxisOptions<ChartDataPoint> => ({
         getValue: (datum) => datum.primary,
      }),
      []
   );

   const secondaryAxes = useMemo(
      (): AxisOptions<ChartDataPoint>[] => [
         {
            getValue: (datum) => datum.secondary,
         },
      ],
      []
   );

   return (
      <>
         <h2 className="text-2xl font-bold mb-4">Aggregated Status</h2>
         <div className="bg-blue-950 rounded-lg p-4 text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Total Space Free:</p>
                  <p className="text-lg">{((latest?.totalSpaceFree ?? 0) / 1024 / 1024).toFixed(2)} GiB</p>
               </div>
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Total Space Available:</p>
                  <p className="text-lg">{((latest?.totalSpaceTotal ?? 0) / 1024 / 1024).toFixed(2)} GiB</p>
               </div>
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Space Used:</p>
                  <p className="text-lg">{(((latest?.totalSpaceTotal ?? 0) - (latest?.totalSpaceFree ?? 0)) / 1024 / 1024).toFixed(2)} GiB</p>
               </div>
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Total Download:</p>
                  <p className="text-lg">{((latest?.totalBwIn ?? 0) / 1024 / 1024).toFixed(2)} Mbps</p>
               </div>
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Total Upload:</p>
                  <p className="text-lg">{((latest?.totalBwOut ?? 0) / 1024 / 1024).toFixed(2)} Mbps</p>
               </div>
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Total Memory Free:</p>
                  <p className="text-lg">{((latest?.totalMemoryFree ?? 0) / 1024 / 1024 / 1024).toFixed(2)} GB</p>
               </div>
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Total Memory Available:</p>
                  <p className="text-lg">{((latest?.totalMemoryTotal ?? 0) / 1024 / 1024 / 1024).toFixed(2)} GB</p>
               </div>
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Memory Used:</p>
                  <p className="text-lg">{(((latest?.totalMemoryTotal ?? 0) - (latest?.totalMemoryFree ?? 0)) / 1024 / 1024 / 1024).toFixed(2)} GB</p>
               </div>
               <div className="bg-blue-900 rounded-lg p-3">
                  <p className="font-semibold text-blue-200">Average CPU Usage:</p>
                  <p className="text-lg">{((latest?.avgCpuUse ?? 0) / 100).toFixed(2)}%</p>
               </div>
            </div>

            {history.length > 0 && (
               <div className="space-y-6">
                  {/* Hard Drive Usage Chart */}
                  <div className="bg-white rounded-lg p-4">
                     <h3 className="text-lg font-semibold mb-2 text-black">Hard Drive Usage (0-100%)</h3>
                     <div className="h-64">
                        <Chart
                           options={{
                              data: hardDriveChart,
                              primaryAxis,
                              secondaryAxes: [
                                 {
                                    getValue: (datum) => datum.secondary,
                                    min: 0,
                                    max: 100,
                                 },
                              ],
                           }}
                        />
                     </div>
                  </div>

                  {/* Network In/Out Chart */}
                  <div className="bg-white rounded-lg p-4">
                     <h3 className="text-lg font-semibold mb-2 text-black">Network Traffic (Mbps)</h3>
                     <div className="h-64">
                        <Chart
                           options={{
                              data: networkChart,
                              primaryAxis,
                              secondaryAxes,
                           }}
                        />
                     </div>
                  </div>

                  {/* CPU Usage Chart */}
                  <div className="bg-white rounded-lg p-4">
                     <h3 className="text-lg font-semibold mb-2 text-black">CPU Usage per Node + Average (%)</h3>
                     <div className="h-64">
                        <Chart
                           options={{
                              data: cpuChart,
                              primaryAxis,
                              secondaryAxes: [
                                 {
                                    getValue: (datum) => datum.secondary,
                                    min: 0,
                                    max: 100,
                                 },
                              ],
                           }}
                        />
                     </div>
                  </div>

                  {/* Bandwidth per Node Chart */}
                  <div className="bg-white rounded-lg p-4">
                     <h3 className="text-lg font-semibold mb-2 text-black">Bandwidth per Node + Averages (Mbps)</h3>
                     <div className="h-64">
                        <Chart
                           options={{
                              data: bandwidthChart,
                              primaryAxis,
                              secondaryAxes,
                           }}
                        />
                     </div>
                  </div>
               </div>
            )}
         </div>
      </>
   );
};

export default StatusPage;
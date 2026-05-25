// Network topology visualization page
import NetworkTopology from '@/components/features/topology/NetworkTopology';
import { getNetworkHierarchy } from '@/lib/topology';
import { seedOltOdcIfEmpty } from '@/lib/seed-olt-odc';
import { seedTopologyLocationsIfPresent } from '@/lib/seed-topology-locations';
import { TopologyLocationRepository } from '@/repositories/TopologyLocationRepository';

export const dynamic = 'force-dynamic';

export default function TopologyPage() {
  seedOltOdcIfEmpty();
  seedTopologyLocationsIfPresent();
  const data = getNetworkHierarchy();
  const locations = TopologyLocationRepository.findAll();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            NETWORK <span className="text-blue-600">TOPOLOGY</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium">
            Visualisasi hirarki infrastruktur OLT (GPON) → ODC → ODP.
          </p>
        </div>
      </div>

      <NetworkTopology initialData={data} initialLocations={locations} />
    </div>
  );
}

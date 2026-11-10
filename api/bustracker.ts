/**
 * Singapore LTA Datamall Serverless Connection Handler
 *
 * Supported Endpoints:
 * - Bus Arrival: https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival
 * - Bus Routes:  http://datamall2.mytransport.sg/ltaodataservice/$metadataBusRoutes (https://datamall2.mytransport.sg/ltaodataservice/BusRoutes)
 * - Bus Services: http://datamall2.mytransport.sg/ltaodataservice/$metadata#BusServices (https://datamall2.mytransport.sg/ltaodataservice/BusServices)
 * - Bus Stops: http://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops (https://datamall2.mytransport.sg/ltaodataservice/BusStops)
 * - Passenger Volume by Bus Stops: http://datamall2.mytransport.sg/ltaodataservice/$metadata#FarecardBatch (http://datamall2.mytransport.sg/ltaodataservice/PV/Bus)
 * - Passenger Volume by Origin Destination: http://datamall2.mytransport.sg/ltaodataservice/$metadata#FarecardBatch (http://datamall2.mytransport.sg/ltaodataservice/PV/ODBus)
 *
 * Header Requirement:
 * AccountKey: <Your_LTA_Datamall_API_Key>
 */

export const LTA_DATAMALL_ENDPOINTS = {
  busArrival: 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival',
  busRoutes: 'https://datamall2.mytransport.sg/ltaodataservice/BusRoutes',
  busServices: 'https://datamall2.mytransport.sg/ltaodataservice/BusServices',
  busStops: 'https://datamall2.mytransport.sg/ltaodataservice/BusStops',
  passengerVolumeBus: 'http://datamall2.mytransport.sg/ltaodataservice/PV/Bus',
  passengerVolumeODBus: 'http://datamall2.mytransport.sg/ltaodataservice/PV/ODBus',
} as const;

export const LTA_METADATA_URLS = {
  busRoutes: 'http://datamall2.mytransport.sg/ltaodataservice/$metadataBusRoutes',
  busServices: 'http://datamall2.mytransport.sg/ltaodataservice/$metadata#BusServices',
  busStops: 'http://datamall2.mytransport.sg/ltaodataservice/$metadata#BusStops',
  passengerVolumeBus: 'http://datamall2.mytransport.sg/ltaodataservice/$metadata#FarecardBatch',
  passengerVolumeODBus: 'http://datamall2.mytransport.sg/ltaodataservice/$metadata#FarecardBatch',
} as const;

export interface DatamallRequestOptions {
  busStopCode?: string;
  serviceNo?: string;
  skip?: number;
  date?: string;
}

/**
 * Retrieves AccountKey safely from environment variables without hardcoding.
 */
export function getDatamallAccountKey(): string {
  return (process.env.LTA_DATAMALL_API_KEY || '').trim();
}

/**
 * Generic request dispatcher for LTA Datamall with the mandatory AccountKey header.
 */
export async function queryLtaDatamall(
  url: string,
  params: Record<string, string | number | undefined> = {}
): Promise<{ success: boolean; data?: any; error?: string; status?: number; warning?: string }> {
  const accountKey = getDatamallAccountKey();

  if (!accountKey) {
    return {
      success: false,
      status: 401,
      warning:
        'AccountKey not configured. Set LTA_DATAMALL_API_KEY in your environment variables (.env).',
    };
  }

  // Construct query parameters
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, String(val));
    }
  });

  const targetUrl = query.toString() ? `${url}?${query.toString()}` : url;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        AccountKey: accountKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        status: response.status,
        error: `LTA Datamall responded with HTTP ${response.status}: ${errorText || response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      status: 200,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 500,
      error: `Failed to connect to LTA Datamall endpoint [${url}]: ${err.message || String(err)}`,
    };
  }
}

// 1. Bus Arrival (/v3/BusArrival)
export async function fetchBusArrival(busStopCode: string, serviceNo?: string) {
  return queryLtaDatamall(LTA_DATAMALL_ENDPOINTS.busArrival, {
    BusStopCode: busStopCode,
    ServiceNo: serviceNo,
  });
}

// 2. Bus Routes (/BusRoutes)
export async function fetchBusRoutes(skip = 0) {
  return queryLtaDatamall(LTA_DATAMALL_ENDPOINTS.busRoutes, {
    $skip: skip,
  });
}

// 3. Bus Services (/BusServices)
export async function fetchBusServices(skip = 0) {
  return queryLtaDatamall(LTA_DATAMALL_ENDPOINTS.busServices, {
    $skip: skip,
  });
}

// 4. Bus Stops (/BusStops)
export async function fetchBusStops(skip = 0) {
  return queryLtaDatamall(LTA_DATAMALL_ENDPOINTS.busStops, {
    $skip: skip,
  });
}

// 5. Passenger Volume by Bus Stops (/PV/Bus)
export async function fetchPassengerVolumeByBusStop(date?: string) {
  return queryLtaDatamall(LTA_DATAMALL_ENDPOINTS.passengerVolumeBus, {
    Date: date,
  });
}

// 6. Passenger Volume by Origin Destination Bus Stops (/PV/ODBus)
export async function fetchPassengerVolumeOD(date?: string) {
  return queryLtaDatamall(LTA_DATAMALL_ENDPOINTS.passengerVolumeODBus, {
    Date: date,
  });
}

/**
 * Serverless / Express HTTP Handler for /api/bustracker
 *
 * Query Parameters:
 * - endpoint: 'arrival' | 'routes' | 'services' | 'stops' | 'pv_bus' | 'pv_od_bus'
 * - busStopCode: string (e.g. '01012')
 * - serviceNo: string (e.g. '190')
 * - skip: number (e.g. 0, 500)
 * - date: string (e.g. '202401')
 */
export default async function handler(req: any, res?: any): Promise<any> {
  const urlObj = new URL(req.url, 'http://localhost:3000');
  const query = Object.fromEntries(urlObj.searchParams.entries());

  // Also extract query params from Express req.query if available
  const params = {
    ...query,
    ...(req.query || {}),
  };

  const endpoint = (params.endpoint || params.action || 'arrival').toLowerCase();
  const busStopCode = (params.busStopCode || params.BusStopCode || '01012') as string;
  const serviceNo = (params.serviceNo || params.ServiceNo) as string | undefined;
  const skip = parseInt((params.skip || params.$skip || '0') as string, 10) || 0;
  const date = (params.date || params.Date) as string | undefined;

  let result: any;

  switch (endpoint) {
    case 'arrival':
    case 'arrivals':
    case 'busarrival':
      result = await fetchBusArrival(busStopCode, serviceNo);
      break;

    case 'routes':
    case 'busroutes':
      result = await fetchBusRoutes(skip);
      break;

    case 'services':
    case 'busservices':
      result = await fetchBusServices(skip);
      break;

    case 'stops':
    case 'busstops':
      result = await fetchBusStops(skip);
      break;

    case 'pv_bus':
    case 'passenger_volume':
    case 'passengervolume':
      result = await fetchPassengerVolumeByBusStop(date);
      break;

    case 'pv_od_bus':
    case 'passenger_volume_od':
    case 'passengervolumeod':
      result = await fetchPassengerVolumeOD(date);
      break;

    default:
      result = {
        success: false,
        status: 400,
        error: `Unknown endpoint action: '${endpoint}'. Supported: 'arrival', 'routes', 'services', 'stops', 'pv_bus', 'pv_od_bus'`,
      };
      break;
  }

  const responsePayload = {
    endpointRequested: endpoint,
    params: {
      busStopCode,
      serviceNo: serviceNo || null,
      skip,
      date: date || null,
    },
    accountKeyConfigured: Boolean(getDatamallAccountKey()),
    metadataUrls: LTA_METADATA_URLS,
    ...result,
  };

  const statusCode = result.status || (result.success ? 200 : 400);

  // If running with Express response object
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(responsePayload);
  }

  // If running in Web standard / Edge fetch environment
  return new Response(JSON.stringify(responsePayload, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, AccountKey',
    },
  });
}

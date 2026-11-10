import type { Request, Response } from 'express';

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp: string;
  uptime: number;
  environment: string;
  datamall: {
    accountKeyConfigured: boolean;
    authHeader: string;
    endpoints: {
      busArrival: string;
      busRoutes: string;
      busServices: string;
      busStops: string;
      passengerVolumeBus: string;
      passengerVolumeODBus: string;
    };
  };
}

export const getHealthData = (): HealthCheckResponse => {
  const accountKey = process.env.LTA_DATAMALL_API_KEY || '';

  return {
    status: 'ok',
    service: 'SG Transit Next - LTA Datamall Serverless API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    datamall: {
      accountKeyConfigured: Boolean(accountKey && accountKey.trim().length > 0),
      authHeader: 'AccountKey',
      endpoints: {
        busArrival: 'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival',
        busRoutes: 'https://datamall2.mytransport.sg/ltaodataservice/BusRoutes',
        busServices: 'https://datamall2.mytransport.sg/ltaodataservice/BusServices',
        busStops: 'https://datamall2.mytransport.sg/ltaodataservice/BusStops',
        passengerVolumeBus: 'http://datamall2.mytransport.sg/ltaodataservice/PV/Bus',
        passengerVolumeODBus: 'http://datamall2.mytransport.sg/ltaodataservice/PV/ODBus',
      },
    },
  };
};

/**
 * Serverless / Express HTTP Handler for /api/health
 */
export default async function handler(req: any, res?: any): Promise<any> {
  const healthData = getHealthData();

  // If invoked with Express / Node HTTP response object
  if (res && typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json(healthData);
  }

  // If invoked in Web standard / Edge fetch environment (Request -> Response)
  return new Response(JSON.stringify(healthData, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

/** Normalized IP-lookup payload shown in the UI. */
export interface IpInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  isp: string;
}

interface IpApiResponse {
  ip?: string;
  query?: string;
  ipAddress?: string;
  city?: string;
  region?: string;
  regionName?: string;
  country?: string;
  country_name?: string;
  countryCode?: string;
  isp?: string;
  org?: string;
  data?: Partial<IpApiResponse>;
}

const IP_API_URL = 'https://getipinfo.sethfengli.workers.dev/';

/**
 * Fetches and normalizes public IP information from the FengTech
 * Cloudflare Worker endpoint. Normalization keeps the API's shape
 * differences out of the component.
 */
@Injectable({ providedIn: 'root' })
export class IpService {
  private readonly http = inject(HttpClient);

  getIpInfo(): Observable<IpInfo> {
    return this.http.get<IpApiResponse>(IP_API_URL).pipe(
      map((response) => {
        const data = response?.data ?? response;
        return {
          ip: data?.ip ?? data?.query ?? data?.ipAddress ?? 'N/A',
          city: data?.city ?? 'N/A',
          region: data?.region ?? data?.regionName ?? 'N/A',
          country: data?.country ?? data?.country_name ?? data?.countryCode ?? 'N/A',
          isp: data?.isp ?? data?.org ?? 'N/A',
        };
      }),
    );
  }
}

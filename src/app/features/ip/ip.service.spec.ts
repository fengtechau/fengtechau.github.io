import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { describe, expect, it } from 'vitest';

import { IpService } from './ip.service';

const IP_API_URL = 'https://getipinfo.sethfengli.workers.dev/';

describe('IpService', () => {
  function setup(): { service: IpService; httpMock: HttpTestingController } {
    TestBed.configureTestingModule({
      providers: [IpService, provideHttpClient(), provideHttpClientTesting()],
    });
    return {
      service: TestBed.inject(IpService),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('normalizes a flat API response', () => {
    const { service, httpMock } = setup();

    let result: unknown;
    service.getIpInfo().subscribe((info) => (result = info));

    httpMock.expectOne(IP_API_URL).flush({
      query: '203.0.113.7',
      city: 'Sydney',
      regionName: 'NSW',
      country: 'Australia',
      org: 'ACME ISP',
    });

    expect(result).toEqual({
      ip: '203.0.113.7',
      city: 'Sydney',
      region: 'NSW',
      country: 'Australia',
      isp: 'ACME ISP',
    });
    httpMock.verify();
  });

  it('unwraps a nested `data` response', () => {
    const { service, httpMock } = setup();

    let result: unknown;
    service.getIpInfo().subscribe((info) => (result = info));

    httpMock.expectOne(IP_API_URL).flush({
      data: { ip: '198.51.100.4', city: 'Melbourne', country_name: 'Australia' },
    });

    expect((result as { ip: string }).ip).toBe('198.51.100.4');
    expect((result as { city: string }).city).toBe('Melbourne');
    expect((result as { country: string }).country).toBe('Australia');
    httpMock.verify();
  });

  it('falls back to N/A for missing fields', () => {
    const { service, httpMock } = setup();

    let result: unknown;
    service.getIpInfo().subscribe((info) => (result = info));

    httpMock.expectOne(IP_API_URL).flush({});

    expect(result).toEqual({
      ip: 'N/A',
      city: 'N/A',
      region: 'N/A',
      country: 'N/A',
      isp: 'N/A',
    });
    httpMock.verify();
  });
});

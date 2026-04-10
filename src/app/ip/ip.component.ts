import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AppTitleService } from '../services/app-title.service';

interface IpDetails {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-ip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ip.component.html',
  styleUrls: ['./ip.component.scss'],
  providers: [AppTitleService],
})
export class IpComponent implements OnInit {
  ipDetails: IpDetails | null = null;
  errorMessage = '';
  loading = true;

  private http = inject(HttpClient);
  private appTitleService = inject(AppTitleService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.appTitleService.setTitle('Get Current IP Address');
    this.loadIpDetails();
  }

  private loadIpDetails(): void {
    this.loading = true;
    this.errorMessage = '';
    this.ipDetails = null;

    this.http.get<any>('https://getipinfo.sethfengli.workers.dev/').subscribe({
      next: (response) => {
        console.log('Raw API response:', response);

        const data = response?.data ?? response;

        this.ipDetails = {
          ip: data?.ip ?? data?.query ?? data?.ipAddress ?? 'N/A',
          city: data?.city ?? 'N/A',
          region: data?.region ?? data?.regionName ?? 'N/A',
          country:
            data?.country ?? data?.country_name ?? data?.countryCode ?? 'N/A',
          ...data,
        };

        console.log('Mapped ipDetails:', this.ipDetails);

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching IP details:', error);
        this.errorMessage = 'Failed to load IP information.';
        this.ipDetails = null;
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}

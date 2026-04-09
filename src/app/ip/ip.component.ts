import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppTitleService } from '../services/app-title.service';
import { catchError, of, switchMap, tap } from 'rxjs';

interface IpResponse {
  ip: string;
}

interface IpDetails {
  city?: string;
  region?: string;
  country?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-ip',
  templateUrl: './ip.component.html',
  styleUrls: ['./ip.component.scss'],
  providers: [AppTitleService],
})
export class IpComponent implements OnInit {
  ip: string = '';
  ipDetails: IpDetails | null = null;
  errorMessage: string = '';

  private http = inject(HttpClient);
  private appTitleService = inject(AppTitleService);

  ngOnInit(): void {
    this.appTitleService.setTitle('Get Current IP Address');

    this.http
      .get<IpResponse>('https://api.ipify.org?format=json')
      .pipe(
        tap((ipResponse) => {
          console.log('IP response:', ipResponse);
          this.ip = ipResponse.ip;
        }),
        switchMap((ipResponse) =>
          this.http.get<IpDetails>(`http://ip-api.com/json/${ipResponse.ip}`),
        ),
        tap((detailsResponse) => {
          console.log('IP details response:', detailsResponse);
        }),
        catchError((error) => {
          console.error('Error fetching IP details:', error);
          this.errorMessage = 'Failed to load IP information.';
          return of(null);
        }),
      )
      .subscribe((detailsResponse) => {
        if (detailsResponse) {
          this.ipDetails = detailsResponse;
        }
      });
  }
}

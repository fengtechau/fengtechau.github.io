import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppTitleService } from '../services/app-title.service';

@Component({
  selector: 'app-ip',
  templateUrl: './ip.component.html',
  styleUrl: './ip.component.scss',
  providers: [AppTitleService],
})
export class IpComponent implements OnInit {
  ip: string = '';
  ipDetails: any;
  private http = inject(HttpClient);
  private appTitleService = inject(AppTitleService);

  ngOnInit() {
    this.appTitleService.setTitle('Get Current IP Address');
    this.http.get<{ ip: string }>('https://api.ipify.org?format=json').subscribe({
      next: (ipResponse) => {
        this.ip = ipResponse.ip;
        this.http.get(`https://ipapi.co/${this.ip}/json/`).subscribe({
          next: (detailsResponse) => {
            this.ipDetails = detailsResponse;
          },
          error: (error) => {
            console.error('Error fetching IP details:', error);
          }
        });
      },
      error: (error) => {
        console.error('Error fetching IP address:', error);
      }
    });
  }
}

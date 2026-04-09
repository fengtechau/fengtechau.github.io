import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppTitleService } from '../services/app-title.service';
import { firstValueFrom } from 'rxjs';

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

  async ngOnInit() {
    this.appTitleService.setTitle('Get Current IP Address');
    try {
      const ipResponse = await firstValueFrom(
        this.http.get<{ ip: string }>('https://api.ipify.org?format=json')
      );
      this.ip = ipResponse.ip;
      
      const detailsResponse = await firstValueFrom(
        this.http.get(`https://ipapi.co/${this.ip}/json/`)
      );
      this.ipDetails = detailsResponse;
    } catch (error) {
      console.error('Error fetching IP details:', error);
    }
  }
}

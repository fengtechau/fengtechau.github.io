import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AppTitleService } from '../services/app-title.service';

@Component({
  selector: 'app-ip',
  imports: [RouterLink],
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
      const data: any = await this.http.get('https://api.ipify.org?format=json').toPromise();
      this.ip = data.ip;
      const details: any = await this.http.get(`https://ipapi.co/${this.ip}/json/`).toPromise();
      this.ipDetails = details;
    } catch (error) {
      console.error('Error fetching IP details:', error);
    }
  }
}

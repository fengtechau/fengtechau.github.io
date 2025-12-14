import { Component, OnInit } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { AppTitleService } from '../services/app-title.service';

@Component({
    selector: 'app-ip',
    imports: [],
    templateUrl: './ip.component.html',
    styleUrl: './ip.component.scss',
    providers: [AppTitleService]
})
export class IpComponent implements OnInit {
  ip: string = '';
  ipDetails: any;
  constructor(
    private http: HttpClient,
    private appTitleService: AppTitleService
  ) {}

  ngOnInit() {
    this.appTitleService.setTitle('Get Current IP Address');
    this.http
      .get('https://api.ipify.org?format=json')
      .subscribe((data: any) => {
        this.ip = data.ip;
        this.http
          .get(`https://ipapi.co/${this.ip}/json/`)
          .subscribe((details: any) => {
            this.ipDetails = details;
          });
      });
  }
}

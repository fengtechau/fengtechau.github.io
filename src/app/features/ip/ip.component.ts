import { Component, inject, OnInit, signal } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCopy,
  faLocationDot,
  faRotateRight,
  faNetworkWired,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';

import { AppTitleService } from '../../core/services/app-title.service';
import { IpInfo, IpService } from './ip.service';

type IpStatus = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-ip',
  standalone: true,
  imports: [FontAwesomeModule],
  templateUrl: './ip.component.html',
  styleUrls: ['./ip.component.scss'],
})
export class IpComponent implements OnInit {
  private readonly ipService = inject(IpService);
  private readonly appTitleService = inject(AppTitleService);

  protected readonly icons = {
    faCopy,
    faLocationDot,
    faRotateRight,
    faNetworkWired,
    faCheck,
  };

  readonly status = signal<IpStatus>('loading');
  readonly info = signal<IpInfo | null>(null);
  readonly errorMessage = signal('');
  readonly copied = signal(false);

  private copiedTimer: number | undefined;

  ngOnInit(): void {
    this.appTitleService.setTitle('Get Current IP Address');
    this.loadIpDetails();
  }

  loadIpDetails(): void {
    this.status.set('loading');
    this.errorMessage.set('');
    this.info.set(null);

    this.ipService.getIpInfo().subscribe({
      next: (info) => {
        this.info.set(info);
        this.status.set('success');
      },
      error: () => {
        this.errorMessage.set('Failed to load IP information.');
        this.status.set('error');
      },
    });
  }

  async copyIp(): Promise<void> {
    const ip = this.info()?.ip;
    if (!ip || ip === 'N/A') {
      return;
    }
    try {
      await navigator.clipboard.writeText(ip);
      this.copied.set(true);
      window.clearTimeout(this.copiedTimer);
      this.copiedTimer = window.setTimeout(() => this.copied.set(false), 1600);
    } catch {
      // Clipboard unavailable — nothing else to do.
    }
  }
}

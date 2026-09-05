import { Component, inject } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faClipboardCheck,
  faCloud,
  faComments,
  faDatabase,
  faGlobe,
  faHeadset,
  faMagnifyingGlass,
  faRobot,
  faScrewdriverWrench,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppTitleService } from '../../core/services/app-title.service';

type Tone = 'blue' | 'green' | 'orange';

interface ServiceItem {
  icon: IconDefinition;
  tone: Tone;
  image: string;
  altKey: string;
  titleKey: string;
  textKey: string;
  tags: string[];
}

interface ProcessStep {
  icon: IconDefinition;
  titleKey: string;
  textKey: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [FontAwesomeModule, TranslatePipe],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent {
  private readonly appTitleService = inject(AppTitleService);
  private readonly i18n = inject(TranslateService);

  protected readonly services: ServiceItem[] = [
    {
      icon: faGlobe,
      tone: 'blue',
      image: '/assets/images/About/about1.jpg',
      altKey: 'HOME.SERVICE_WEB_ALT',
      titleKey: 'HOME.SERVICE_WEB_TITLE',
      textKey: 'HOME.SERVICE_WEB_TEXT',
      tags: [
        'HOME.SERVICE_WEB_TAG1',
        'HOME.SERVICE_WEB_TAG2',
        'HOME.SERVICE_WEB_TAG3',
        'HOME.SERVICE_WEB_TAG4',
      ],
    },
    {
      icon: faRobot,
      tone: 'green',
      image: '/assets/images/robot.jpg?auto=compress&cs=tinysrgb&w=1200',
      altKey: 'HOME.SERVICE_AI_ALT',
      titleKey: 'HOME.SERVICE_AI_TITLE',
      textKey: 'HOME.SERVICE_AI_TEXT',
      tags: [
        'HOME.SERVICE_AI_TAG1',
        'HOME.SERVICE_AI_TAG2',
        'HOME.SERVICE_AI_TAG3',
        'HOME.SERVICE_AI_TAG4',
      ],
    },
    {
      icon: faDatabase,
      tone: 'orange',
      image: '/assets/images/servers.jpg?auto=compress&cs=tinysrgb&w=1200',
      altKey: 'HOME.SERVICE_DB_ALT',
      titleKey: 'HOME.SERVICE_DB_TITLE',
      textKey: 'HOME.SERVICE_DB_TEXT',
      tags: [
        'HOME.SERVICE_DB_TAG1',
        'HOME.SERVICE_DB_TAG2',
        'HOME.SERVICE_DB_TAG3',
        'HOME.SERVICE_DB_TAG4',
      ],
    },
    {
      icon: faCloud,
      tone: 'blue',
      image: '/assets/images/routers.jpg?auto=compress&cs=tinysrgb&w=1200',
      altKey: 'HOME.SERVICE_CLOUD_ALT',
      titleKey: 'HOME.SERVICE_CLOUD_TITLE',
      textKey: 'HOME.SERVICE_CLOUD_TEXT',
      tags: [
        'HOME.SERVICE_CLOUD_TAG1',
        'HOME.SERVICE_CLOUD_TAG2',
        'HOME.SERVICE_CLOUD_TAG3',
        'HOME.SERVICE_CLOUD_TAG4',
      ],
    },
    {
      icon: faScrewdriverWrench,
      tone: 'green',
      image: '/assets/images/About/about2.jpg',
      altKey: 'HOME.SERVICE_PC_ALT',
      titleKey: 'HOME.SERVICE_PC_TITLE',
      textKey: 'HOME.SERVICE_PC_TEXT',
      tags: [
        'HOME.SERVICE_PC_TAG1',
        'HOME.SERVICE_PC_TAG2',
        'HOME.SERVICE_PC_TAG3',
        'HOME.SERVICE_PC_TAG4',
      ],
    },
    {
      icon: faHeadset,
      tone: 'orange',
      image: '/assets/images/About/about3.jpg',
      altKey: 'HOME.SERVICE_SUPPORT_ALT',
      titleKey: 'HOME.SERVICE_SUPPORT_TITLE',
      textKey: 'HOME.SERVICE_SUPPORT_TEXT',
      tags: [
        'HOME.SERVICE_SUPPORT_TAG1',
        'HOME.SERVICE_SUPPORT_TAG2',
        'HOME.SERVICE_SUPPORT_TAG3',
        'HOME.SERVICE_SUPPORT_TAG4',
      ],
    },
  ];

  protected readonly processSteps: ProcessStep[] = [
    {
      icon: faComments,
      titleKey: 'HOME.PROCESS1_TITLE',
      textKey: 'HOME.PROCESS1_TEXT',
    },
    {
      icon: faMagnifyingGlass,
      titleKey: 'HOME.PROCESS2_TITLE',
      textKey: 'HOME.PROCESS2_TEXT',
    },
    {
      icon: faScrewdriverWrench,
      titleKey: 'HOME.PROCESS3_TITLE',
      textKey: 'HOME.PROCESS3_TEXT',
    },
    {
      icon: faClipboardCheck,
      titleKey: 'HOME.PROCESS4_TITLE',
      textKey: 'HOME.PROCESS4_TEXT',
    },
  ];

  constructor() {
    this.appTitleService.setTitle(this.i18n.instant('HOME.SERVICES_TITLE'));
  }
}

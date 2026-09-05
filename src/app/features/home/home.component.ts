import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faBolt,
  faComments,
  faDollarSign,
  faEnvelope,
  faFont,
  faMusic,
  faNetworkWired,
  faScrewdriverWrench,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppTitleService } from '../../core/services/app-title.service';

type Tone = 'blue' | 'green' | 'orange';

interface StatItem {
  valueKey: string;
  labelKey: string;
}

interface WhyItem {
  icon: IconDefinition;
  tone: Tone;
  titleKey: string;
  textKey: string;
}

interface ToolItem {
  icon: IconDefinition;
  tone: Tone;
  path: string;
  labelKey: string;
  descKey: string;
  ariaKey: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FontAwesomeModule, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly appTitleService = inject(AppTitleService);
  private readonly i18n = inject(TranslateService);

  protected readonly icons = {
    faEnvelope,
  };

  protected readonly stats: StatItem[] = [
    { valueKey: 'HOME.STAT1_VALUE', labelKey: 'HOME.STAT1_LABEL' },
    { valueKey: 'HOME.STAT2_VALUE', labelKey: 'HOME.STAT2_LABEL' },
    { valueKey: 'HOME.STAT3_VALUE', labelKey: 'HOME.STAT3_LABEL' },
    { valueKey: 'HOME.STAT4_VALUE', labelKey: 'HOME.STAT4_LABEL' },
  ];

  protected readonly whyUs: WhyItem[] = [
    {
      icon: faScrewdriverWrench,
      tone: 'blue',
      titleKey: 'HOME.WHY1_TITLE',
      textKey: 'HOME.WHY1_TEXT',
    },
    {
      icon: faDollarSign,
      tone: 'green',
      titleKey: 'HOME.WHY2_TITLE',
      textKey: 'HOME.WHY2_TEXT',
    },
    {
      icon: faBolt,
      tone: 'orange',
      titleKey: 'HOME.WHY3_TITLE',
      textKey: 'HOME.WHY3_TEXT',
    },
    {
      icon: faComments,
      tone: 'blue',
      titleKey: 'HOME.WHY4_TITLE',
      textKey: 'HOME.WHY4_TEXT',
    },
  ];

  protected readonly tools: ToolItem[] = [
    {
      icon: faNetworkWired,
      tone: 'blue',
      path: '/ip',
      labelKey: 'HOME.TOOL_IP_LABEL',
      descKey: 'HOME.TOOL_IP_DESC',
      ariaKey: 'HOME.TOOL_IP_ARIA',
    },
    {
      icon: faFont,
      tone: 'green',
      path: '/texttools',
      labelKey: 'HOME.TOOL_CASE_LABEL',
      descKey: 'HOME.TOOL_CASE_DESC',
      ariaKey: 'HOME.TOOL_CASE_ARIA',
    },
    {
      icon: faMusic,
      tone: 'orange',
      path: '/metronome',
      labelKey: 'HOME.TOOL_METRO_LABEL',
      descKey: 'HOME.TOOL_METRO_DESC',
      ariaKey: 'HOME.TOOL_METRO_ARIA',
    },
  ];

  constructor() {
    this.appTitleService.setTitle(this.i18n.instant('HOME.PAGE_TITLE'));
  }
}

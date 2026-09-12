import { UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowRight,
  faArrowUpRightFromSquare,
  faBolt,
  faCheck,
  faChevronDown,
  faCircleExclamation,
  faClock,
  faComments,
  faCopy,
  faDatabase,
  faEnvelope,
  faHeadset,
  faLaptopCode,
  faLocationDot,
  faPaperPlane,
  faRobot,
  faScrewdriverWrench,
  faShieldHalved,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AppTitleService } from '../../core/services/app-title.service';

type Tone = 'blue' | 'green' | 'orange' | 'violet';
type IconKey = 'faBolt' | 'faClock' | 'faShieldHalved';

interface HeroBadge {
  iconKey: IconKey;
  key: string;
}

interface Channel {
  /** Stable id, also used for the "copied" acknowledgement. */
  key: string;
  icon: IconDefinition;
  tone: Tone;
  labelKey: string;
  valueKey: string;
  hintKey: string;
  /** Raw text copied to the clipboard, when the channel has one. */
  copyValue?: string;
  /** External link target, when the channel has one. */
  href?: string;
}

interface SimpleItem {
  icon: IconDefinition;
  tone: Tone;
  titleKey: string;
  textKey: string;
}

interface StepItem {
  titleKey: string;
  textKey: string;
}

interface RadarNode {
  x: number;
  y: number;
  r: number;
  dur: number;
  delay: number;
}

/** The enquiry form's fields, validated without a forms library. */
interface EnquiryForm {
  name: string;
  email: string;
  company: string;
  topic: string;
  message: string;
}

const CONTACT_EMAIL = 'info@fengtech.com.au';
const CONTACT_PHONE_DISPLAY = '0411 758 128';
const CONTACT_PHONE_HREF = '+61411758128';

/** How long the copy button shows its confirmation tick. */
const COPIED_RESET_MS = 2000;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MIN_LENGTH = 10;

/**
 * Decorative pings on the coverage radar — hand-placed so the dots read as
 * "greater Sydney" rather than a random scatter.
 */
const COVERAGE_NODES: RadarNode[] = [
  { x: 160, y: 160, r: 7, dur: 2.2, delay: 0 },
  { x: 118, y: 122, r: 5, dur: 3.1, delay: 0.4 },
  { x: 210, y: 138, r: 4, dur: 2.7, delay: 0.9 },
  { x: 138, y: 216, r: 4.5, dur: 3.4, delay: 1.4 },
  { x: 232, y: 198, r: 5, dur: 2.9, delay: 0.2 },
  { x: 96, y: 186, r: 3.5, dur: 3.8, delay: 1.9 },
  { x: 250, y: 108, r: 3.5, dur: 3.2, delay: 1.1 },
  { x: 178, y: 250, r: 4, dur: 3.6, delay: 2.3 },
  { x: 74, y: 132, r: 3, dur: 4.1, delay: 2.7 },
];

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [UpperCasePipe, RouterLink, FontAwesomeModule, TranslatePipe],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private readonly appTitleService = inject(AppTitleService);
  private readonly i18n = inject(TranslateService);

  protected readonly icons = {
    faArrowRight,
    faArrowUpRightFromSquare,
    faBolt,
    faCheck,
    faChevronDown,
    faCircleExclamation,
    faClock,
    faComments,
    faCopy,
    faEnvelope,
    faPaperPlane,
    faShieldHalved,
  };

  protected readonly copiedKey = signal<string | null>(null);

  protected readonly heroBadges: HeroBadge[] = [
    { iconKey: 'faBolt', key: 'CONTACT.BADGE_SAME_DAY' },
    { iconKey: 'faShieldHalved', key: 'CONTACT.BADGE_FIXED_QUOTE' },
    { iconKey: 'faClock', key: 'CONTACT.BADGE_NO_CALL_CENTRE' },
  ];

  protected readonly channels: Channel[] = [
    {
      key: 'email',
      icon: faEnvelope,
      tone: 'blue',
      labelKey: 'CONTACT.EMAIL_LABEL',
      valueKey: 'CONTACT.EMAIL_VALUE',
      hintKey: 'CONTACT.EMAIL_HINT',
      copyValue: CONTACT_EMAIL,
      href: `mailto:${CONTACT_EMAIL}`,
    },
    {
      key: 'phone',
      icon: faHeadset,
      tone: 'green',
      labelKey: 'HOME.CONTACT_PHONE_LABEL',
      valueKey: 'CONTACT.PHONE_VALUE',
      hintKey: 'HOME.CONTACT_PHONE_HINT',
      copyValue: CONTACT_PHONE_DISPLAY,
      href: `tel:${CONTACT_PHONE_HREF}`,
    },
    {
      key: 'location',
      icon: faLocationDot,
      tone: 'orange',
      labelKey: 'CONTACT.LOCATION_LABEL',
      valueKey: 'CONTACT.LOCATION_VALUE',
      hintKey: 'CONTACT.LOCATION_HINT',
    },
  ];

  protected readonly preferTips: string[] = [
    'CONTACT.PREFER_TIP1',
    'CONTACT.PREFER_TIP2',
    'CONTACT.PREFER_TIP3',
  ];

  protected readonly serviceOptions: string[] = [
    'CONTACT.OPTION_GENERAL',
    'CONTACT.OPTION_SUPPORT',
    'CONTACT.OPTION_WEB',
    'CONTACT.OPTION_AI',
    'CONTACT.OPTION_DATA',
    'CONTACT.OPTION_CLOUD',
  ];

  protected readonly responseSteps: StepItem[] = [
    { titleKey: 'CONTACT.STEP1_TITLE', textKey: 'CONTACT.STEP1_TEXT' },
    { titleKey: 'CONTACT.STEP2_TITLE', textKey: 'CONTACT.STEP2_TEXT' },
    { titleKey: 'CONTACT.STEP3_TITLE', textKey: 'CONTACT.STEP3_TEXT' },
  ];

  protected readonly enquiryTypes: SimpleItem[] = [
    {
      icon: faScrewdriverWrench,
      tone: 'blue',
      titleKey: 'CONTACT.TOPIC_SUPPORT_TITLE',
      textKey: 'CONTACT.TOPIC_SUPPORT_TEXT',
    },
    {
      icon: faLaptopCode,
      tone: 'green',
      titleKey: 'CONTACT.TOPIC_WEB_TITLE',
      textKey: 'CONTACT.TOPIC_WEB_TEXT',
    },
    {
      icon: faRobot,
      tone: 'violet',
      titleKey: 'CONTACT.TOPIC_AI_TITLE',
      textKey: 'CONTACT.TOPIC_AI_TEXT',
    },
    {
      icon: faDatabase,
      tone: 'orange',
      titleKey: 'CONTACT.TOPIC_DATA_TITLE',
      textKey: 'CONTACT.TOPIC_DATA_TEXT',
    },
  ];

  protected readonly coverageNodes = COVERAGE_NODES;

  protected readonly faqs: StepItem[] = [
    { titleKey: 'CONTACT.FAQ1_Q', textKey: 'CONTACT.FAQ1_A' },
    { titleKey: 'CONTACT.FAQ2_Q', textKey: 'CONTACT.FAQ2_A' },
    { titleKey: 'CONTACT.FAQ3_Q', textKey: 'CONTACT.FAQ3_A' },
    { titleKey: 'CONTACT.FAQ4_Q', textKey: 'CONTACT.FAQ4_A' },
  ];

  protected readonly form = signal<EnquiryForm>({
    name: '',
    email: '',
    company: '',
    topic: this.serviceOptions[0],
    message: '',
  });

  /** Validation errors only appear after the first submit attempt. */
  protected readonly submitted = signal(false);

  protected readonly nameInvalid = computed(
    () => this.submitted() && this.form().name.trim().length === 0,
  );

  protected readonly emailInvalid = computed(() => {
    if (!this.submitted()) {
      return false;
    }
    return !EMAIL_PATTERN.test(this.form().email.trim());
  });

  protected readonly messageInvalid = computed(
    () => this.submitted() && this.form().message.trim().length < MESSAGE_MIN_LENGTH,
  );

  protected readonly formInvalid = computed(
    () => this.nameInvalid() || this.emailInvalid() || this.messageInvalid(),
  );

  /**
   * A pre-addressed mailto: link built from the form. The site is fully
   * static (GitHub Pages), so the form hands off to the visitor's own mail
   * client rather than posting to a server.
   */
  protected readonly mailtoHref = computed(() => this.buildMailto(this.form()));

  constructor() {
    this.appTitleService.setTitle(this.i18n.instant('HOME.CONTACT_TITLE'));
  }

  /** `[value]` + `(input)` binding — no forms module required. */
  protected setField(field: keyof EnquiryForm, value: string): void {
    this.form.update((current) => ({ ...current, [field]: value }));
  }

  /**
   * Runs on the form's `submit` event. The native submit is always
   * cancelled in the template binding — this site is static, so the form
   * must never do a real GET.
   */
  protected onSubmit(): void {
    this.submitted.set(true);
    if (this.formInvalid()) {
      return;
    }
    window.location.href = this.mailtoHref();
  }

  async copy(channel: Channel): Promise<void> {
    const value = channel.copyValue;
    if (!value) {
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard blocked (insecure origin / denied) — still acknowledge so
      // the visitor can select the text manually.
    }
    this.copiedKey.set(channel.key);
    window.setTimeout(() => {
      if (this.copiedKey() === channel.key) {
        this.copiedKey.set(null);
      }
    }, COPIED_RESET_MS);
  }

  private buildMailto(value: EnquiryForm): string {
    const subject = `Website enquiry — ${this.i18n.instant(value.topic)}`;
    const lines = [
      value.message,
      '',
      `${this.i18n.instant('CONTACT.MAILTO_NAME')}: ${value.name}`,
      `${this.i18n.instant('CONTACT.MAILTO_EMAIL')}: ${value.email}`,
    ];
    if (value.company.trim()) {
      lines.push(`${this.i18n.instant('CONTACT.MAILTO_COMPANY')}: ${value.company}`);
    }
    const body = lines.join('\n').trim();
    const query = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return `mailto:${CONTACT_EMAIL}?${query}`;
  }
}

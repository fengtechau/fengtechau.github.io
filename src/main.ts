import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { AppComponent } from './app/app.component';
import { AppRoutingModule } from './app/app-routing.module';
import { AppTitleService } from './app/services/app-title.service';

bootstrapApplication(AppComponent, {
  providers: [
    AppTitleService,
    importProvidersFrom(
      BrowserAnimationsModule,
      HttpClientModule,
      ReactiveFormsModule,
      AppRoutingModule,
      TranslateModule.forRoot({
        fallbackLang: 'en',
        loader: provideTranslateHttpLoader({
          prefix: '../assets/i18n/',
          suffix: '.json',
        }),
      }),
    ),
  ],
}).catch((err) => console.error(err));

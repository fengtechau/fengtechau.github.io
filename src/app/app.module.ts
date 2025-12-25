import { ApplicationConfig, NgModule } from '@angular/core';

import { importProvidersFrom } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatGridListModule } from '@angular/material/grid-list';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  provideHttpClient,
  withInterceptorsFromDi,
  HttpClient,
  HttpClientModule,
} from '@angular/common/http';
import { AppTitleService } from './services/app-title.service';

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    MatCardModule,
    ReactiveFormsModule,
    MatGridListModule,
    FontAwesomeModule,
    HttpClientModule,

    TranslateModule.forRoot({
      fallbackLang: 'en', // v17 术语：fallbackLang（替代 defaultLanguage 概念）
      loader: provideTranslateHttpLoader({
        prefix: '../assets/i18n/',
        suffix: '.json',
      }),
    }),
  ],
  providers: [AppTitleService, provideHttpClient(withInterceptorsFromDi())],
})
export class AppModule {}

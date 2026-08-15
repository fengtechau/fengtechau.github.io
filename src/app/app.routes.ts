import { Routes } from '@angular/router';

/**
 * Application routes. All feature pages are lazy-loaded so the
 * initial bundle only contains the shell.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'ip',
    loadComponent: () =>
      import('./features/ip/ip.component').then((m) => m.IpComponent),
  },
  {
    path: 'texttools',
    loadComponent: () =>
      import('./features/tools/tools.component').then((m) => m.ToolsComponent),
  },
  {
    path: 'metronome',
    loadComponent: () =>
      import('./features/metronome/metronome.component').then(
        (m) => m.MetronomeComponent,
      ),
  },
  { path: '**', redirectTo: 'home' },
];

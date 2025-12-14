import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ToolsComponent } from './tools/tools.component';
import { IpComponent } from './ip/ip.component';
import { MetronomeComponent } from './metronome/metronome.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  {
    path: 'texttools',
    component: ToolsComponent,
  },
  {
    path: 'ip',
    component: IpComponent,
  },
  {
    path: 'metronome',
    component: MetronomeComponent,
  },
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}

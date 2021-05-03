import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { ScanPopoverComponent } from 'src/app/components/scan-devices/scan-devices.component';


@NgModule({
  declarations: [
    ScanPopoverComponent
  ],
  exports: [
    ScanPopoverComponent
  ],
  imports: [
    CommonModule,
    IonicModule
  ]
})
export class ComponentsModule { }

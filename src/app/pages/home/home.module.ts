import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';

import { BluetoothLE } from '@ionic-native/bluetooth-le/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule
  ],
  providers:[BluetoothLE ,AndroidPermissions],
  declarations: [HomePage]
})
export class HomePageModule {}

import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, PopoverController } from '@ionic/angular';

import { BluetoothLE } from '@ionic-native/bluetooth-le/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';

@Component({
  selector: 'app-scan-popover',
  templateUrl: './scan-popover.component.html',
  styleUrls: ['./scan-popover.component.scss'],
})
export class ScanPopoverComponent implements OnInit {

  constructor(private loadingCtrl: LoadingController,
              private bluetoothLE: BluetoothLE,
              private androidPermissions: AndroidPermissions
              ) { }

  ngOnInit() {}

}

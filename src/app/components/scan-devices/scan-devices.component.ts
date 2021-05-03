import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { LoadingController, PopoverController } from '@ionic/angular';

import { BluetoothLE } from '@ionic-native/bluetooth-le/ngx';


@Component({
  selector: 'app-scan-devices',
  templateUrl: './scan-devices.component.html',
  styleUrls: ['./scan-devices.component.scss'],
})
export class ScanPopoverComponent implements OnInit {

   //list of discovered devices
  /*device = {
    name: 'Alvaro',
    address: 'AlvarezMorales'
  }*/
  devicesList  = [];


  //loading type
  loading: HTMLIonLoadingElement;

  //status
  isScanning: boolean = true;
  newScan: boolean = false;


  constructor(private bluetoothLE: BluetoothLE,
              private changeRef: ChangeDetectorRef,
              private loadingCtrl: LoadingController,
              private popoverCtrl: PopoverController
              ) { }

  async ngOnInit() {
    await this.getScanStatus();
    if (this.newScan && !this.isScanning){
      this.scanDevices(60000);
    } else {
      console.log('Already scanning or error');
    }
  }


  //scan status
  async getScanStatus() {    
    await this.bluetoothLE.isScanning().then( isScanningSucces => {
      this.isScanning = isScanningSucces.isScanning;
      this.newScan = true;
      console.log('Scanning status', isScanningSucces.isScanning);
    }).catch( isScanningError => {
      console.log('Error when check scanning status', isScanningError);
      this.newScan = false;
    });
  }


  scanDevices(timeOut_PRE: number) {

    //reset list of devices
    this.devicesList = [];
    
    //scan parameters
    let params = {
      "services": ["FFF0", "FFF1"],
      "allowDuplicates": true,
      "scanMode": this.bluetoothLE.SCAN_MODE_LOW_POWER, 
      "matchMode": this.bluetoothLE.MATCH_MODE_AGGRESSIVE, 
      "matchNum": this.bluetoothLE.MATCH_NUM_ONE_ADVERTISEMENT, 
      "calbackType": this.bluetoothLE.CALLBACK_TYPE_FIRST_MATCH
    }
    
    //scan devices method
    this.bluetoothLE.startScan(params).subscribe( startScanSuccess => {
      if ( startScanSuccess.status === 'scanStarted') { //scan started
        console.log('Scanning for new devices...');
        this.isScanning = true;
      } else if ( startScanSuccess.status === 'scanResult') { //device found
        console.log('Device found:', startScanSuccess)
        this.saveDevice(startScanSuccess.name, startScanSuccess.address, startScanSuccess.advertisement);
      }
    }, startScanError => {
      console.log('Error when scanning for new devices', startScanError);
    });

    //scan timeout
    setTimeout(() => {
      console.log('Time expired');
      this.stopScan_bluetoohLE();
    }, timeOut_PRE);
  }


  //save new device
  saveDevice(name: string, address: string, advertisement) {   
    
    //discovered device
    let discoveredDevice = {
      name,
      address,
      advertisement
    }

    //check if device is in the list
    function inList (item) {
      if (item.address === discoveredDevice.address) {
        return true;
      } else {
        return false;
      }     
    }
    let oldDevice = this.devicesList.some(inList);

    //save device in the list if it is not there
    if (!oldDevice) {
      if (!discoveredDevice.name) {
        discoveredDevice.name = ' - '
      }
      this.devicesList.push(discoveredDevice);
      this.changeRef.detectChanges(); //refresh screen
      console.log('It is new device');
    } else {
      console.log ('It is already in the list');      
    }

  }


  //Stop scan devices
  stopScan_bluetoohLE() {
      
    //stop scan devices method
    this.bluetoothLE.isScanning().then( resp => {
      if (resp.isScanning) {
        this.bluetoothLE.stopScan().then( stopScanSuccess => {
          console.log('Scan for new devices stopped', stopScanSuccess);
          this.isScanning = false;
          this.changeRef.detectChanges(); //refresh screen
          console.log('List of devices', this.devicesList);
          //console.log(this.bluetoothLE.encodedStringToBytes(this.devicesList[0].advertisement));
          //console.log(this.bluetoothLE.bytesToString(this.bluetoothLE.encodedStringToBytes(this.devicesList[0].advertisement)));
        }, stopScanError => {
          console.log('Error when stop scan for new devices', stopScanError);
        });
      } else {
        console.log('Scan for new devices is already stopped');
      }
    });

  }


  //Pair/Bond the device
  async pairDevice(deviceAddress: string) {
    
    //definitions
    let devicePaired: boolean = false;
    let params = {
      address: deviceAddress
    };
    let pairStatus;

    //check if device already paired
    await this.bluetoothLE.isBonded(params).then( isBondedSuccess => {
      console.log('Device paired status', isBondedSuccess);
      devicePaired = isBondedSuccess.isBonded;
    }).catch( isBondedError => {
      console.log('Error when check device paired', isBondedError);
    });

    //pair device
    if ( !devicePaired ) {
      this.bluetoothLE.bond(params).subscribe( bondSuccess => {
        console.log('Pair device status', bondSuccess);
        pairStatus = bondSuccess.status;
        if ( pairStatus === 'bonding' ) {
          this.presentLoading('Pairing device');
        } else if ( pairStatus === 'bonded' ) {
          console.log('Device corectly paired', bondSuccess);
          this.loading.dismiss();
        } else if ( pairStatus === 'unbonded') {
          console.log('Not possible to pair the device', bondSuccess);
          this.loading.dismiss();
        }
      }, bondError => {
        console.log('Error when attempt to pair device', bondError);
      });
    }
    
  }


  //Connect with chosen device
  async connectDevice(device) {

    //definitions
    let deviceConnected: boolean = false;
    let deviceWasConnected: boolean = false;
    let params = {
      address: device.address
    }
    let connectStatus;

    //check connection - already connected
    console.log('Checking the connection...')
    await this.bluetoothLE.isConnected(params).then( isConnectedSucces => {
      console.log('Connection with the device status', isConnectedSucces.isConnected);
      deviceConnected = isConnectedSucces.isConnected;
    }).catch( isConnectedError => {
      console.log('Error when checking if device is already connected', isConnectedError);
    });

    if ( !deviceConnected ) {

      //check connection - was connected
      await this.bluetoothLE.wasConnected(params).then( wasConnectedSuccess => {
        console.log('Device was connected status', wasConnectedSuccess.wasConnected);
        deviceWasConnected = wasConnectedSuccess.wasConnected;
      }).catch( wasConnectedError => {
        console.log('Error when checking if device was previously connected', wasConnectedError);
      });

      //present loading
      console.log('Connecting with the device...');
      this.presentLoading('Conecting with the device');

      //connect with the device - first time
      if ( !deviceWasConnected ) {
        this.bluetoothLE.connect(params).subscribe( connectSuccess => {
          connectStatus = connectSuccess.status;
          console.log('Connect status', connectSuccess);
          this.loading.dismiss();
          if ( connectStatus === 'connected') {
            console.log('Devcie succesfully connected')
            deviceConnected = true;
            this.closeWithArguments(device);
          } else if ( connectStatus === 'disconnected') {
            console.log('Device disconected');
            deviceConnected = false;
          }
        }, connectError => {
          console.log('Error when attempt to connect', connectError);
          this.loading.dismiss();
        });
      } else { //connect with the device - not first time -> reconnect
        this.bluetoothLE.reconnect(params).subscribe( reconnectSuccess => {
          connectStatus = reconnectSuccess.status;
          console.log('Connect status', reconnectSuccess);
          this.loading.dismiss();
          if ( connectStatus === 'connected') {
            console.log('Devcie succesfully reconnected')
            deviceConnected = true;
            this.closeWithArguments(device);
          } else if ( connectStatus === 'disconnected') {
            console.log('Device disconected');
            deviceConnected = false;
          }
        }, reconnectError => {
          console.log('Error when attempt to reconnect', reconnectError);
          this.loading.dismiss();
        });
      }

    } else {
      console.log('Device already connected');
    }

  }


  //Close popover without arguments
  closeNoArguments() {
    console.log('Close with no arguments');
    this.popoverCtrl.dismiss();
  }


  //Close popover with arguments
  closeWithArguments( data ) {
    console.log('Chosen device', data);
    this.popoverCtrl.dismiss(data);
  }


  //Present loading
  async presentLoading( message: string ) {
    this.loading = await this.loadingCtrl.create({
      spinner: 'circles',
      message,
      backdropDismiss: false
    });
    await this.loading.present();

    const { role, data } = await this.loading.onDidDismiss();
    console.log('Loading dismissed!');
  }
  

}

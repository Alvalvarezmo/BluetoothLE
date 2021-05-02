import { Component } from '@angular/core';
import { AlertController, LoadingController, PopoverController } from '@ionic/angular';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { BluetoothLE } from '@ionic-native/bluetooth-le/ngx';
import { ScanPopoverComponent } from 'src/app/components/scan-popover/scan-popover.component';




@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})


export class HomePage {

  //Adapter status
  bleStatus = {
    initialized: false,
    enabled: false,
    scanning: false,
    connected: false,
    discoverable: false,
    subscribed: false,
    conn_device_address: '',
    conn_device_name: ''
  }

  
  //list of discovered devices
  /*device = {
    name: 'Alvaro',
    address: 'AlvarezMorales'
  }*/
  devicesList  = [];


  //loading type
  loading: HTMLIonLoadingElement;

  constructor(private alertCtrl: AlertController,
              private bluetoothLE: BluetoothLE,
              private androidPermissions: AndroidPermissions,
              private loadingCtrl: LoadingController,
              private popoverCtrl: PopoverController
              ) { }

  ngOnInit() {

  }


  //Bluetooth adapter ready
  async adapterReady_bluetoothLE() {

    //check adapter status
    await this.getAdapterInfo();

    //initialize and enable
    if (!this.bleStatus.initialized) {
      this.initilaize_bluetoothLE(true, true);
    } else if (!this.bleStatus.enabled) {
      this.bluetoothLE.enable();
      this.bleStatus.enabled = true;      
    }

  }


  //Bluetooth adapter info
  async getAdapterInfo() {
    await this.bluetoothLE.getAdapterInfo().then( respAdInfo => {
      this.bleStatus.initialized = respAdInfo.isInitialized;
      this.bleStatus.enabled = respAdInfo.isEnabled;
      this.bleStatus.scanning = respAdInfo.isScanning;
      console.log('Estado del adaptador ', respAdInfo);
    }).catch( errAdInfo => {
      console.log('Error en la lectura del stado del adaptador ', errAdInfo);
    });
  }


  async initilaize_bluetoothLE(request: boolean, statusReceiver: boolean) {
    
    //Initialization parameters
    let params = {
      "request": request,
      "statusReceiver": statusReceiver
    }
    
    //Debug log
    console.log('Initializing...');
    
    //Initialize adapter
    this.bluetoothLE.initialize(params).subscribe( initializeSuccess => {
      this.bleStatus.initialized = true;
      console.log('Init done', initializeSuccess);
      if (initializeSuccess.status === "disabled") {
        this.bluetoothLE.enable();
        this.bleStatus.enabled = true;
      } 
    }, initializeError => {
      console.log('Error at initialization', initializeError);
    });

  }


  //Scan devices bluetoothLE
  async scanDevices_bluetoothLE() {
    
    //definitions
    let rdyToScan = false;

    //reset list of devices
    this.devicesList = [];
    
    //scan parameters
    let params = {
      "services": [],
      "allowDuplicates": true,
      "scanMode": this.bluetoothLE.SCAN_MODE_LOW_POWER, 
      "matchMode": this.bluetoothLE.MATCH_MODE_AGGRESSIVE, 
      "matchNum": this.bluetoothLE.MATCH_NUM_ONE_ADVERTISEMENT, 
      "calbackType": this.bluetoothLE.CALLBACK_TYPE_FIRST_MATCH
    }

    //check permission and location services
    rdyToScan = await this.readyToScan();

    //scan for devices
    if (!this.bleStatus.scanning && rdyToScan) {
      //show the loading pop up
      this.presentLoading('Searching for devices');
      //scan devices method
      this.bluetoothLE.startScan(params).subscribe( startScanSuccess => {
        if ( startScanSuccess.status === 'scanStarted') { //scan started
          console.log('Scanning for new devices...');
          this.bleStatus.scanning = true;
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
      }, 60000);

    } else {
      console.log('Not ready to scan or already scanning for devices...');
    }

    
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
      console.log('It is new device');
      //console.log('List of devices', this.devicesList);
    } else {
      console.log ('It is already in the list');      
    }

  }

  //Stop scan devices
  stopScan_bluetoohLE() {
    
    //stop loading pop up
    this.loading.dismiss();
    
    //stop scan devices method
    this.bluetoothLE.isScanning().then( resp => {
      if (resp.isScanning) {
        this.bluetoothLE.stopScan().then( stopScanSuccess => {
          console.log('Scan for new devices stopped', stopScanSuccess);
          this.bleStatus.scanning = false;
          console.log('List of devices', this.devicesList);
          this.presentPopover();
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


  //Check permissions ready to scan
  async readyPermissions() {
    
    //neccessary permission to scan for devices
    let locationPermList = ["android.permission.ACCESS_COARSE_LOCATION",
                            "android.permission.ACCESS_FINE_LOCATION",
                            "android.permission.ACCESS_BACKGROUND_LOCATION"
                          ];

    //check and request permissions if neccessary  
    for (let permission of locationPermList) {                 
      await this.getPermissions(permission);
    }
  }


  //check and request permission 
  async getPermissions(locationPerm: string) {    
    
    //local definitions
    let permissionAlowed = false;
    
    //check permission status
    await this.androidPermissions.checkPermission(locationPerm).then( checkPermissinSuccess => {
      console.log(locationPerm, 'status', checkPermissinSuccess);
      permissionAlowed = checkPermissinSuccess.hasPermission;
    }).catch( checkPermissionError => {
      console.log('check', locationPerm, ' finished with error', checkPermissionError);
    });

    //permission request
    if (!permissionAlowed) {
      await this.androidPermissions.requestPermission(locationPerm).then( reqPermissionSucces => {
        console.log(locationPerm, 'status', reqPermissionSucces);
        permissionAlowed = reqPermissionSucces.hasPermission;
      }). catch( reqPermissionError => {
        console.log('Error when request', locationPerm, reqPermissionError);
      });
    }

    //return permission status
    return permissionAlowed;
  }


  //bluetooth adapter ready to scan: In API 29 "android.permission.ACCESS_FINE_LOCATION" must be allowed, also location services must be enabled
  async readyToScan() {

    //definitions
    let locationEnabled = false;
    let permissionEnabled = false;
    let permission = "android.permission.ACCESS_FINE_LOCATION";

    //check location enable
    await this.bluetoothLE.isLocationEnabled().then( isLocatEnabSuccess => {
      console.log('Location services status', isLocatEnabSuccess);
      locationEnabled = isLocatEnabSuccess.isLocationEnabled;
    }).catch( isLocEnabError => {
      console.log('Check location enable error', isLocEnabError);
    });

    //request enable location services to user
    if (!locationEnabled) {
      this.showError('Please enable location services (GPS)');      
      /*await this.bluetoothLE.requestLocation().then(reqLocationSuccess => {
        console.log('Request location success', reqLocationSuccess);
      }).catch( reqLocationError => {
        console.log('Reques location error', reqLocationError);
      });*/
    }    

    //check necessary permission
    permissionEnabled = await this.getPermissions(permission);

    //return ready to scan status
    console.log('ready to scan status', permissionEnabled && locationEnabled);
    return (permissionEnabled && locationEnabled);

  }
 
  
  //Show message in alert style
  async showError(message){
    let alert = await this.alertCtrl.create({
      backdropDismiss: false,
      header: 'Error',
      message,
      buttons: ['Close']
    });
    await alert.present();
  }

  //Show loading message with loading icon
  async presentLoading(message: string) {
    this.loading = await this.loadingCtrl.create({
      message,
    });
    await this.loading.present();
  }

  //Show popover of scan devices
  async presentPopover() {
    const popover = await this.popoverCtrl.create({
      component: ScanPopoverComponent,
      translucent: true
    });
    await popover.present();

    const { role } = await popover.onDidDismiss();
    console.log('onDidDismiss resolved with role', role);
  }
  
}

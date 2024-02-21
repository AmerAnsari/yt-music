import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SearchComponent } from '@app/search/search.component';
import { SongYoutube } from '@app/shared/interfaces/song-youtube';
import { SystemService } from '@app/shared/services/system.service';
import { UtilsService } from '@app/shared/services/utils.service';
import { Media, MEDIA_STATUS, MediaObject } from '@ionic-native/media/ngx';
import { RangeCustomEvent } from '@ionic/angular';
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCol,
  IonContent,
  IonFab,
  IonFabButton,
  IonFooter,
  IonGrid,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonProgressBar,
  IonRange,
  IonRow,
  IonSpinner,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { add, arrowRedo, pause, play, playSkipBack, playSkipForward, trash } from 'ionicons/icons';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    IonAvatar,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
    IonButton,
    IonButtons,
    IonCol,
    IonGrid,
    IonRow,
    IonFooter,
    IonThumbnail,
    IonRange,
    IonProgressBar,
    CommonModule,
    ReactiveFormsModule,
  ],
  providers: [
    Media,
  ],
})
export class HomePage implements OnInit, OnDestroy {

  /** Subscription to destroy the observables to avoid unnecessary subscriptions. */
  private readonly subscriptions: Subscription = new Subscription();
  private subscriptionPlayer: Subscription | undefined;

  /** Saved songs. */
  songs: SongYoutube[] = [];

  /** Songs loading indicator. */
  loading = true;

  /** Selected song to play. */
  songSelected?: SongYoutube;

  /** Player song instance.  */
  player!: MediaObject;

  /** Player interval instance. */
  playerInterval!: number;

  /** Whether the song is playing. */
  isPlaying = false;

  /** Player current position in progress for UI range input. */
  playerProgressControl: FormControl<number> = new FormControl<number>(0, { nonNullable: true });

  /** Whether the progress knob is moving. */
  playerKnobMoving = false;

  /** PLayer current progress in time (mm:ss). */
  playerProgressTime = '00:00';

  /** PLayer duration in time (mm:ss). */
  playerDurationTime = '00:00';

  constructor(private modalController: ModalController,
              private media: Media,
              private changeDetectorRef: ChangeDetectorRef,
              private systemService: SystemService) {
    addIcons({
      add,
      arrowRedo,
      trash,
      playSkipBack,
      playSkipForward,
      play,
      pause,
    });
  }

  ngOnInit(): void {

    /** Load the songs. */
    this.subscriptions.add(
      this.systemService.loadSongs().subscribe({
        next: (songs: SongYoutube[] | null): void => {
          if (songs) {
            this.songs = songs;
            this.loading = false;
          }
        },
      }),
    );

    /** Watch for the progress control value changes. */
    this.subscriptions.add(
      this.playerProgressControl.valueChanges.subscribe({
        next: (progress: number): void => {
          if (this.playerKnobMoving) {
            this.playerProgressTime = UtilsService.secondsToTime((this.player.getDuration() / 100) * progress);
          }
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.subscriptionPlayer?.unsubscribe();
  }

  openSearchModal(): void {
    this.modalController.create({
      component: SearchComponent,
    }).then((modal: HTMLIonModalElement): void => {
      modal.present().then();
    });
  }

  /** Select the song to play. */
  songSelect(song: SongYoutube): void {

    /** Stop the player initially anyway. */
    if (this.player) {
      this.player.stop();
    }

    /** Set the song. */
    this.songSelected = song;

    /** Create the player instance. */
    this.player = this.media.create(song.path as string);

    /** Watch for the player status. */
    this.subscriptionPlayer?.unsubscribe();
    this.subscriptionPlayer = this.player.onStatusUpdate.subscribe({
      next: (status: MEDIA_STATUS): void => {

        /** Clear the interval initially. */
        clearInterval(this.playerInterval);

        /** Update the progress if the song is playing. */
        if (status === MEDIA_STATUS.RUNNING) {

          /** Watch for the player current position every second to update the progress for the sake of UI. */
          this.playerInterval = setInterval((): void => {
            this.player.getCurrentPosition().then((position: number): void => {

              /** Set the song duration time. */
              this.playerDurationTime = UtilsService.secondsToTime(this.player.getDuration());

              /** Set the player current progress if progress knob is not moving. */
              if (!this.playerKnobMoving) {
                this.playerProgressControl.setValue((position / this.player.getDuration()) * 100);
                this.playerProgressTime = UtilsService.secondsToTime(position);
              }
              this.changeDetectorRef.detectChanges();
            });
          }, 1000);
        }

        /** {@link isPlaying} */
        this.isPlaying = status === MEDIA_STATUS.RUNNING;
        this.changeDetectorRef.detectChanges();
      },
    });

    /** Play the song. */
    this.player.play();
  }

  togglePlayer(): void {
    if (this.isPlaying) {
      this.player.pause();
    } else {
      this.player.play();
    }
  }

  songSelectFull(modalSheet: IonModal): void {
    modalSheet.present().then();
  }

  seekTo(event: RangeCustomEvent): void {
    this.player.seekTo((this.player.getDuration() * (Number(event.detail.value) / 100)) * 1000);
    this.playerKnobMoving = false;
  }
}
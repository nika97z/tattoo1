import {
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  computed,
  input,
  numberAttribute,
  signal,
  viewChildren,
} from '@angular/core';
import { Header } from '../header/header';
import { RouterLink } from '@angular/router';

interface PortfolioImage {
  src: string;
  alt: string;
}

@Component({
  selector: 'app-portfolio',
  imports: [Header, RouterLink],
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss',
})
export class Portfolio {
  showHeader = input(true);
  limit = input<number | undefined>(undefined, { transform: numberAttribute });

  heroBackgroundImage =
    'linear-gradient(rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.72)), url(filer.jpg)';

  images: PortfolioImage[] = [
    { src: 'SaveClip.me_660440723_18578842849015420_1037649969937574324_n.jpg', alt: 'Horror-themed forearm sleeve with elderly nun portrait and "Do Not Cross" tape band' },
    { src: 'SaveClip.me_661679063_18578842858015420_1585140597344446205_n.jpg', alt: 'Horror-themed sleeve tattoo detail with armed nuns and crime scene tape' },
    { src: 'SaveClip.me_735354665_18605886067015420_9067568772822370967_n.jpg', alt: 'Portrait tattoo of a woman in a feather headband with a bloodied hand over her mouth' },
    { src: 'SaveClip.me_735446756_18605886232015420_7227489210277851342_n.jpg', alt: 'Portrait tattoo of a blindfolded woman crowned with a laurel wreath' },
    { src: 'SaveClip.me_743034535_18608080429015420_6523898804903247849_n.jpg', alt: 'Close-up black and grey dragon scale texture tattoo on shoulder' },
    { src: 'SaveClip.me_750376568_18609386323015420_347492643520673953_n.jpg', alt: 'Ocean-themed sleeve tattoo with waves, sharks, a sea turtle, and manta rays' },
    { src: 'SaveClip.me_754126889_18611638921015420_6090667558286196324_n.jpg', alt: 'Whiskey glass with ice cubes and script lettering tattoo on forearm' },
    { src: 'SaveClip.me_755221049_18612268048015420_8437620006342058547_n.jpg', alt: 'Fox spirit woman portrait with cherry blossoms on sleeve' },
    { src: 'SaveClip.me_756846606_18612268066015420_1056615076112629634_n.jpg', alt: 'Close-up of fox spirit mask and cherry blossoms sleeve tattoo' },
    { src: 'SaveClip.me_757666045_18613856350015420_2524329103223615782_n.jpg', alt: 'Horror tattoo of a demonic creature bursting through skin with flames and chains' },
    { src: 'SaveClip.me_761748335_18613856314015420_4383422252349968108_n.jpg', alt: 'Armored knight in chainmail holding a sword against a stained glass background' },
    { src: 'SaveClip.me_768592384_18616233184015420_51821636420934068_n.jpg', alt: 'Hand tattoo of a lone figure walking a mountain landscape with zodiac symbols on the fingers' },
    { src: 'SaveClip.me_747105637_18608702479015420_8117633935930322586_n.jpg', alt: 'Realistic eye and rose tattoo with memorial date script on forearm' },
    { src: 'SaveClip.me_747796254_18608080438015420_8500585246467744554_n.jpg', alt: 'Black and grey dragon tattoo covering the shoulder and upper arm' },
  ];

  displayedImages = computed(() => {
    const limit = this.limit();
    return limit ? this.images.slice(0, limit) : this.images;
  });

  gridItemEls = viewChildren<ElementRef<HTMLElement>>('gridItemEl');
  imgEls = viewChildren<ElementRef<HTMLImageElement>>('imgEl');
  visibleIndices = signal<ReadonlySet<number>>(new Set());
  loadedIndices = signal<ReadonlySet<number>>(new Set());

  constructor() {
    afterNextRender(() => {
      const checkAll = () => {
        const els = this.gridItemEls();
        const next = new Set(this.visibleIndices());
        let changed = false;

        els.forEach((elRef, i) => {
          if (next.has(i)) return;
          const rect = elRef.nativeElement.getBoundingClientRect();
          const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
          if (visible > rect.height * 0.3) {
            next.add(i);
            changed = true;
          }
        });

        if (changed) this.visibleIndices.set(next);
        if (next.size === els.length) window.removeEventListener('scroll', onScroll);
      };

      let ticking = false;
      const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          ticking = false;
          checkAll();
        });
      };

      // Images already served from the browser cache fire no `load` event by the
      // time we're listening, so mark those as loaded up front.
      const loaded = new Set(this.loadedIndices());
      this.imgEls().forEach((elRef, i) => {
        if (elRef.nativeElement.complete) loaded.add(i);
      });
      this.loadedIndices.set(loaded);

      requestAnimationFrame(() => requestAnimationFrame(checkAll));
      window.addEventListener('scroll', onScroll, { passive: true });
    });
  }

  onImageLoad(index: number): void {
    if (this.loadedIndices().has(index)) return;
    this.loadedIndices.set(new Set(this.loadedIndices()).add(index));
  }

  isRevealed(index: number): boolean {
    return this.visibleIndices().has(index) && this.loadedIndices().has(index);
  }

  activeIndex = signal<number | null>(null);
  activeImage = computed(() => {
    const i = this.activeIndex();
    return i === null ? null : this.displayedImages()[i];
  });

  open(index: number): void {
    this.activeIndex.set(index);
  }

  close(): void {
    this.activeIndex.set(null);
  }

  onOverlayClick(event: MouseEvent): void {
    if (event.clientX < window.innerWidth / 2) {
      this.prev(event);
    } else {
      this.next(event);
    }
  }

  prev(event: Event): void {
    event.stopPropagation();
    const i = this.activeIndex();
    if (i === null) return;
    const total = this.displayedImages().length;
    this.activeIndex.set((i - 1 + total) % total);
  }

  next(event: Event): void {
    event.stopPropagation();
    const i = this.activeIndex();
    if (i === null) return;
    const total = this.displayedImages().length;
    this.activeIndex.set((i + 1) % total);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.activeIndex() === null) return;
    if (event.key === 'Escape') this.close();
    if (event.key === 'ArrowLeft') this.prev(event);
    if (event.key === 'ArrowRight') this.next(event);
  }
}

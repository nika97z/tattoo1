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

  images: PortfolioImage[] = [];

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

import { Component, ElementRef, input, output, ViewChild } from '@angular/core';
/* import * as bootstrap from 'bootstrap'; */
declare var bootstrap: any;

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.css'
})
export class ConfirmationComponent {

  @ViewChild('modal') modalRef!: ElementRef;
  private resolve!: (value: boolean) => void;
  private modal!: any;
  

  ngAfterViewInit() {
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
  }

  open(): Promise<boolean> {
    this.modal.show();

    return new Promise<boolean>((resolve) => {
      this.resolve = resolve;
    });
  }

  close() {
    this.modal.hide();
  }

  onConfirm() {
    this.resolve(true);
    this.close();
  }

  onCancel() {
    this.resolve(false);
    this.close();
  }
}

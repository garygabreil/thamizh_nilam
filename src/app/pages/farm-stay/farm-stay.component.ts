import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Functions, FunctionsModule } from '@angular/fire/functions';
import {
  Firestore,
  collection,
  addDoc,
  query,
  serverTimestamp,
  FieldValue,
  onSnapshot,
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { httpsCallable } from '@angular/fire/functions';
import { FeedbackCarouselComponent } from '../feedback-carousel/feedback-carousel.component';

interface Booking {
  id?: string;
  name: string;
  email: string;
  phone: string;
  guests: number | string;
  checkin: string;
  checkout: string;
  roomType: string;
  specialRequests?: string;
  totalAmount: number;
  createdAt: FieldValue;
}

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isBooked: boolean;
  isSelected: boolean;
  isCheckIn: boolean;
  isCheckOut: boolean;
  isPast: boolean;
  isAvailable: boolean;
}

interface RoomType {
  id: string;
  name: string;
  price: number;
  description: string;
}

@Component({
  selector: 'app-farm-stay',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FunctionsModule,
    FeedbackCarouselComponent,
  ],
  templateUrl: './farm-stay.component.html',
  styleUrls: ['./farm-stay.component.css'],
})
export class FarmStayComponent implements OnInit, OnDestroy {
  currentMonthDate: Date = new Date();
  calendarDays: CalendarDay[] = [];
  monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  currentMonthYear: string = '';
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  bookingForm: FormGroup;
  accommodationTypes: RoomType[] = [
    {
      id: 'standard',
      name: 'Standard Cottage',
      price: 1500,
      description:
        'Cozy cottage with basic amenities, perfect for couples or solo travelers.',
    },
    {
      id: 'family',
      name: 'Family Cottage',
      price: 2500,
      description:
        'Spacious cottage with 2 bedrooms, suitable for families up to 5 people.',
    },
    {
      id: 'deluxe',
      name: 'Deluxe Cottage',
      price: 3500,
      description:
        'Luxurious cottage with premium amenities and beautiful views.',
    },
  ];

  isLoading = false;
  isSuccess = false;
  showTotal = false;
  totalAmount = 0;
  selectedRoomType: RoomType | null = null;

  private firestore: Firestore = inject(Firestore);
  private bookingsCollection = collection(this.firestore, 'farm-stay-bookings');
  private bookedDatesSet = new Set<string>();
  private firestoreUnsubscribe: (() => void) | undefined;

  private selectedCheckIn: Date | null = null;
  private selectedCheckOut: Date | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private functions: Functions
  ) {
    this.bookingForm = this.fb.group(
      {
        name: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        phone: [
          '',
          [Validators.required, Validators.pattern(/^[0-9]{10,15}$/)],
        ],
        guests: [
          '',
          [Validators.required, Validators.min(1), Validators.max(10)],
        ],
        checkin: ['', Validators.required],
        checkout: ['', Validators.required],
        roomType: ['', Validators.required],
        specialRequests: ['', Validators.maxLength(500)],
      },
      { validator: this.checkOutAfterCheckInValidator }
    );

    this.bookingForm.get('checkin')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });

    this.bookingForm.get('checkout')?.valueChanges.subscribe(() => {
      this.calculateTotal();
    });

    this.bookingForm.get('roomType')?.valueChanges.subscribe((val) => {
      this.selectedRoomType =
        this.accommodationTypes.find((r) => r.id === val) || null;
      this.calculateTotal();
    });
  }

  ngOnInit(): void {
    this.currentMonthDate.setDate(1);
    this.updateCurrentMonthYear();
    this.fetchBookedDatesAndBuildCalendar();

    this.bookingForm.get('checkin')?.valueChanges.subscribe((val) => {
      this.selectedCheckIn = val ? new Date(val + 'T00:00:00') : null;
      this.updateCalendarHighlights();
    });

    this.bookingForm.get('checkout')?.valueChanges.subscribe((val) => {
      this.selectedCheckOut = val ? new Date(val + 'T00:00:00') : null;
      this.updateCalendarHighlights();
    });
  }

  ngOnDestroy(): void {
    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
    }
  }

  // Helper function to format dates in local time
  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  goBack(): void {
    this.router.navigate(['/']);
  }

  selectPackage(packageType: string): void {
    this.bookingForm.patchValue({
      roomType: packageType,
    });
    document
      .getElementById('reservationForm')
      ?.scrollIntoView({ behavior: 'smooth' });
  }

  prevMonth(): void {
    this.navigateMonth(-1);
  }

  nextMonth(): void {
    this.navigateMonth(1);
  }

  selectDate(day: CalendarDay): void {
    this.onDateClick(day);
  }

  onBookingSubmit(): void {
    this.onSubmit();
  }

  get f(): { [key: string]: AbstractControl } {
    return this.bookingForm.controls;
  }

  getToday(): string {
    return this.toLocalDateString(new Date());
  }

  getSelectedRoomType(): RoomType | null {
    return this.selectedRoomType;
  }

  getNumberOfNights(checkin: string, checkout: string): number {
    if (!checkin || !checkout) return 0;
    const start = new Date(checkin + 'T00:00:00');
    const end = new Date(checkout + 'T00:00:00');
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private fetchBookedDatesAndBuildCalendar(): void {
    const q = query(this.bookingsCollection);
    this.firestoreUnsubscribe = onSnapshot(q, (snapshot) => {
      this.bookedDatesSet.clear();
      snapshot.forEach((doc) => {
        const booking = doc.data() as Booking;
        const checkin = new Date(booking.checkin + 'T00:00:00');
        const checkout = new Date(booking.checkout + 'T00:00:00');

        const currentDate = new Date(checkin);
        while (currentDate <= checkout) {
          this.bookedDatesSet.add(this.toLocalDateString(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
      this.buildCalendar();
    });
  }

  private buildCalendar(): void {
    this.calendarDays = [];

    const firstDayOfMonth = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth() + 1,
      0
    );

    const startingDayOfWeek = firstDayOfMonth.getDay();

    // Add days from previous month
    const prevMonthLastDay = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth(),
      0
    ).getDate();

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(
        this.currentMonthDate.getFullYear(),
        this.currentMonthDate.getMonth() - 1,
        prevMonthLastDay - i
      );
      this.addCalendarDay(date, false);
    }

    // Add days from current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(
        this.currentMonthDate.getFullYear(),
        this.currentMonthDate.getMonth(),
        i
      );
      this.addCalendarDay(date, true);
    }

    // Add days from next month to complete the grid
    const daysToAdd = 42 - this.calendarDays.length;
    for (let i = 1; i <= daysToAdd; i++) {
      const date = new Date(
        this.currentMonthDate.getFullYear(),
        this.currentMonthDate.getMonth() + 1,
        i
      );
      this.addCalendarDay(date, false);
    }

    this.updateCalendarHighlights();
  }

  private addCalendarDay(date: Date, isCurrentMonth: boolean): void {
    const dateString = this.toLocalDateString(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.calendarDays.push({
      date: date,
      dayOfMonth: date.getDate(),
      isCurrentMonth: isCurrentMonth,
      isBooked: this.bookedDatesSet.has(dateString),
      isSelected: false,
      isCheckIn: false,
      isCheckOut: false,
      isPast: date < today,
      isAvailable: !this.bookedDatesSet.has(dateString) && date >= today,
    });
  }

  private updateCalendarHighlights(): void {
    this.calendarDays.forEach((day) => {
      day.isSelected = false;
      day.isCheckIn = false;
      day.isCheckOut = false;

      if (
        this.selectedCheckIn &&
        this.isSameDay(day.date, this.selectedCheckIn)
      ) {
        day.isCheckIn = true;
      }

      if (
        this.selectedCheckOut &&
        this.isSameDay(day.date, this.selectedCheckOut)
      ) {
        day.isCheckOut = true;
      }

      if (
        this.selectedCheckIn &&
        this.selectedCheckOut &&
        day.date >= this.selectedCheckIn &&
        day.date <= this.selectedCheckOut
      ) {
        day.isSelected = true;
      }
    });
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  private updateCurrentMonthYear(): void {
    this.currentMonthYear = `${
      this.monthNames[this.currentMonthDate.getMonth()]
    } ${this.currentMonthDate.getFullYear()}`;
  }

  navigateMonth(offset: number): void {
    this.currentMonthDate = new Date(
      this.currentMonthDate.getFullYear(),
      this.currentMonthDate.getMonth() + offset,
      1
    );
    this.updateCurrentMonthYear();
    this.buildCalendar();
  }

  onDateClick(day: CalendarDay): void {
    if (!day.isAvailable || day.isPast) return;

    const dateString = this.toLocalDateString(day.date);

    if (
      !this.selectedCheckIn ||
      (this.selectedCheckIn && this.selectedCheckOut)
    ) {
      // Selecting new range
      this.bookingForm.patchValue({
        checkin: dateString,
        checkout: '',
      });
    } else if (day.date > this.selectedCheckIn) {
      // Selecting checkout date
      this.bookingForm.patchValue({
        checkout: dateString,
      });
    } else if (day.date < this.selectedCheckIn) {
      // Selecting new check-in date when earlier than current check-in
      this.bookingForm.patchValue({
        checkin: dateString,
        checkout: '',
      });
    }
  }

  private calculateTotal(): void {
    const checkin = this.bookingForm.get('checkin')?.value;
    const checkout = this.bookingForm.get('checkout')?.value;
    const roomType = this.bookingForm.get('roomType')?.value;

    if (checkin && checkout && roomType) {
      const start = new Date(checkin + 'T00:00:00');
      const end = new Date(checkout + 'T00:00:00');
      const nights = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );

      const selectedRoom = this.accommodationTypes.find(
        (r) => r.id === roomType
      );
      if (selectedRoom) {
        this.totalAmount = nights * selectedRoom.price;
        this.showTotal = true;
      }
    } else {
      this.showTotal = false;
    }
  }

  private checkOutAfterCheckInValidator(
    group: FormGroup
  ): ValidationErrors | null {
    const checkinControl = group.get('checkin');
    const checkoutControl = group.get('checkout');

    if (!checkinControl || !checkoutControl) {
      return null;
    }

    const checkin = checkinControl.value;
    const checkout = checkoutControl.value;

    if (!checkin || !checkout) {
      return null;
    }

    const checkinDate = new Date(checkin + 'T00:00:00');
    const checkoutDate = new Date(checkout + 'T00:00:00');

    if (isNaN(checkinDate.getTime())) {
      return { invalidCheckinDate: true };
    }
    if (isNaN(checkoutDate.getTime())) {
      return { invalidCheckoutDate: true };
    }

    const checkinDay = new Date(checkinDate);
    checkinDay.setHours(0, 0, 0, 0);

    const checkoutDay = new Date(checkoutDate);
    checkoutDay.setHours(0, 0, 0, 0);

    if (checkoutDay <= checkinDay) {
      return {
        checkoutBeforeCheckin: {
          checkin: checkinDate,
          checkout: checkoutDate,
        },
      };
    }

    return null;
  }

  private async sendWhatsAppMessage(bookingData: Booking): Promise<boolean> {
    const formattedPhone = bookingData.phone.replace(/\D/g, '');
    if (formattedPhone.length !== 10) return false;

    const message =
      `📌 *Booking Confirmed* 📌\n\n` +
      `*Name:* ${bookingData.name}\n` +
      `*Dates:* ${bookingData.checkin} to ${bookingData.checkout}\n` +
      `*Room:* ${this.getRoomTypeName(bookingData.roomType)}\n` +
      `*Guests:* ${bookingData.guests}\n` +
      `*Amount:* ₹${bookingData.totalAmount}\n\n` +
      `Thank you for choosing Thamizh Nilam!`;

    try {
      const sendMessage = httpsCallable(this.functions, 'sendWhatsAppMessage');
      await sendMessage({
        phone: `91${formattedPhone}`,
        message: message,
      });
      return true;
    } catch (error) {
      console.error('WhatsApp failed:', error);
      return false;
    }
  }

  private getRoomTypeName(roomTypeId: string): string {
    const room = this.accommodationTypes.find((r) => r.id === roomTypeId);
    return room ? room.name : 'Unknown';
  }

  async onSubmit(): Promise<void> {
    if (this.bookingForm.invalid) return;

    this.isLoading = true;

    try {
      const formValue = this.bookingForm.value;
      const bookingData = {
        ...formValue,
        totalAmount: this.totalAmount,
      };

      await addDoc(this.bookingsCollection, {
        ...bookingData,
        createdAt: serverTimestamp(),
      });
      //const bookingId = docRef.id;

      try {
        await httpsCallable(this.functions, 'handleFarmStayBooking')();
      } catch (err) {
        console.log(err);
      }
      this.isSuccess = true;
      setTimeout(() => this.bookingForm.reset(), 3000);
    } catch (error) {
      console.error('Booking process failed:', error);
      alert('Booking failed. Please try again or contact support.');
    } finally {
      this.isLoading = false;
    }
  }

  get minCheckoutDate(): string | null {
    const checkin = this.bookingForm.get('checkin')?.value;
    if (!checkin) return null;

    const checkinDate = new Date(checkin + 'T00:00:00');
    checkinDate.setDate(checkinDate.getDate() + 1);
    return this.toLocalDateString(checkinDate);
  }

  get nightsCount(): number {
    const checkin = this.bookingForm.get('checkin')?.value;
    const checkout = this.bookingForm.get('checkout')?.value;

    if (checkin && checkout) {
      const start = new Date(checkin + 'T00:00:00');
      const end = new Date(checkout + 'T00:00:00');
      return Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    return 0;
  }
}

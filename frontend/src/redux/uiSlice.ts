import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { localDateISO } from "@/lib/date";

export interface BookingDraft {
  category: string;
  pickup: { address: string; lat: number; lng: number } | null;
  drop: { address: string; lat: number; lng: number } | null;
  date: string;
  time: string;
}

interface UIState {
  authModal: { open: boolean; mode: "login" | "register" };
  bookingDraft: BookingDraft;
}

const today = localDateISO();

const initialState: UIState = {
  authModal: { open: false, mode: "login" },
  bookingDraft: {
    category: "car",
    pickup: null,
    drop: null,
    date: today,
    time: "10:00",
  },
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openAuthModal(state, action: PayloadAction<"login" | "register">) {
      state.authModal.open = true;
      state.authModal.mode = action.payload;
    },
    setAuthMode(state, action: PayloadAction<"login" | "register">) {
      state.authModal.mode = action.payload;
    },
    closeAuthModal(state) {
      state.authModal.open = false;
    },
    setBookingDraft(state, action: PayloadAction<Partial<BookingDraft>>) {
      state.bookingDraft = { ...state.bookingDraft, ...action.payload };
    },
  },
});

export const { openAuthModal, setAuthMode, closeAuthModal, setBookingDraft } = uiSlice.actions;
export default uiSlice.reducer;

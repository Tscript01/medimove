import { AmbulanceProvider, Booking, Hospital } from '../types'
import { api } from './api'

export const dispatchService = {
  getNearbyAmbulances: async (lat: number, lng: number): Promise<AmbulanceProvider[]> => {
    return api.get(`/dispatch/ambulances?lat=${lat}&lng=${lng}`)
  },

  getHospitals: async (): Promise<Hospital[]> => {
    return api.get('/dispatch/hospitals')
  },

  createBooking: async (payload: {
    pickupAddress: string
    destAddress: string
    distanceKm: number
    estimatedFare: number
    providerId: string
  }): Promise<Booking> => {
    return api.post('/dispatch/bookings', payload)
  },

  getBookingDetails: async (bookingId: string): Promise<Booking> => {
    return api.get(`/dispatch/bookings/${bookingId}`)
  },

  getUserBookings: async (): Promise<Booking[]> => {
    return api.get('/dispatch/bookings')
  },
}
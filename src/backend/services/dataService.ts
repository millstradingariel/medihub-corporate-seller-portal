import { MOCK_ORDERS, LOCATIONS, DEVICES, PARTNERS } from '../../../constants';
import { Order, Location, Device, Partner } from '../../../types';

export const getPartner = (partnerId: string): Partner | undefined => {
  return PARTNERS.find(p => p.company_id === partnerId);
};

export const getPartnerLocations = (partnerId: string): Location[] => {
  return LOCATIONS.filter(l => l.partner_id === partnerId);
};

export const getPartnerOrders = (partnerId: string): Order[] => {
  return MOCK_ORDERS.filter(o => o.partner_id === partnerId);
};

export const getPartnerDevices = (partnerId: string): Device[] => {
  return DEVICES.filter(d => d.partner_id === partnerId);
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
};

export const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
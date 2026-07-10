/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useTranslation } from 'react-i18next'
import { QRCodeSVG } from 'qrcode.react'

import { CopyButton } from '@/components/copy-button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'

import type { UsdtPaymentDetails } from '../../types'

interface UsdtPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  details: UsdtPaymentDetails | null
}

function DetailRow({
  label,
  value,
  copy = true,
}: {
  label: string
  value: string
  copy?: boolean
}) {
  return (
    <div className='space-y-1.5'>
      <div className='text-muted-foreground text-xs font-medium'>{label}</div>
      <div className='bg-muted/60 flex min-h-10 items-center justify-between gap-2 rounded-md px-3 py-2'>
        <span className='min-w-0 break-all font-mono text-sm'>{value}</span>
        {copy && (
          <CopyButton
            value={value}
            tooltip='Copy'
            successTooltip='Copied'
            iconClassName='h-4 w-4'
          />
        )}
      </div>
    </div>
  )
}

export function UsdtPaymentDialog({
  open,
  onOpenChange,
  details,
}: UsdtPaymentDialogProps) {
  const { t } = useTranslation()

  if (!details) {
    return null
  }

  const copyAll = [
    `Order: ${details.trade_no}`,
    `Network: ${details.network}`,
    `Amount: ${details.amount} ${details.currency}`,
    `Address: ${details.address}`,
  ].join('\n')

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className='max-sm:w-[calc(100vw-1.5rem)] sm:max-w-lg'>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('USDT Payment')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('Scan the QR code with your TRON wallet and send the exact amount. Payment is auto-confirmed on chain.')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='space-y-4 py-2'>
          <div className='flex items-center justify-between rounded-md border px-3 py-2'>
            <span className='text-muted-foreground text-sm'>
              {t('Payment Network')}
            </span>
            <Badge variant='secondary'>{details.network}</Badge>
          </div>

          {/* QR Code */}
          <div className='flex justify-center'>
            <div className='bg-white rounded-xl p-2 shadow-sm'>
              <QRCodeSVG
                value={details.address}
                size={180}
                level='M'
                includeMargin
              />
            </div>
          </div>

          <DetailRow
            label={t('Amount')}
            value={`${details.amount} ${details.currency}`}
          />
          <DetailRow label={t('Receiving Address')} value={details.address} />
          <DetailRow label={t('Order Number')} value={details.trade_no} />

          {details.instructions && (
            <div className='text-muted-foreground rounded-md border p-3 text-sm leading-relaxed'>
              {details.instructions}
            </div>
          )}
        </div>

        <AlertDialogFooter className='grid grid-cols-2 gap-2 sm:flex'>
          <CopyButton
            value={copyAll}
            variant='outline'
            size='default'
            tooltip={t('Copy all payment details')}
            successTooltip={t('Copied!')}
          >
            {t('Copy All')}
          </CopyButton>
          <AlertDialogAction onClick={() => onOpenChange(false)}>{t('Done')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

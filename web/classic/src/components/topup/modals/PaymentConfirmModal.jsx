/*
Copyright (C) 2025 QuantumNous

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

import React, { useState } from 'react';
import { Modal, Typography, Card, Skeleton } from '@douyinfe/semi-ui';
import { SiAlipay, SiWechat, SiStripe } from 'react-icons/si';
import { CreditCard, Copy, CheckCircle, Coins } from 'lucide-react';
import { copy } from '../../../helpers';

const { Text } = Typography;

const TRON_EXPLORER = 'https://tronscan.org/#/';
const POLYGON_EXPLORER = 'https://amoy.polygonscan.com/';

const CRYPTO_CONFIG = {
  usdt: {
    networkLabel: 'TRC20 (TRON)',
    address: 'TY5rpegZJL7iGVLjLt6FmhqnkfMTm3Svnb',
    explorerUrl: TRON_EXPLORER + 'address/TY5rpegZJL7iGVLjLt6FmhqnkfMTm3Svnb',
    instructions: '发送 USDT (TRC20) 到上方收款地址，到账后系统会自动充值。',
    unit: 'USDT',
  },
  c2coin: {
    networkLabel: 'Polygon Amoy (Testnet)',
    address: '0x000000000000000000000000000000000000dEaD',
    explorerUrl: POLYGON_EXPLORER + 'address/0x000000000000000000000000000000000000dEaD',
    contractAddress: '0x5A8a8586A4defba35F066382e3f71273943EFb0E',
    instructions: '将精确数量的 C2-Coin 发送到以下销毁地址。发送完成后，系统将自动确认到账。',
    unit: 'C2-Coin',
  },
};

const CopyBtn = ({ text, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await copy(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
      style={{
        backgroundColor: copied ? '#10B981' : 'var(--semi-color-primary)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
      {copied ? '已复制' : '复制'}
    </button>
  );
};

const PaymentConfirmModal = ({
  t,
  open,
  onlineTopUp,
  handleCancel,
  confirmLoading,
  topUpCount,
  renderQuotaWithAmount,
  amountLoading,
  renderAmount,
  payWay,
  payMethods,
  amountNumber,
  discountRate,
  c2coinExchangeRate,
}) => {
  const hasDiscount =
    discountRate && discountRate > 0 && discountRate < 1 && amountNumber > 0;
  const originalAmount = hasDiscount ? amountNumber / discountRate : 0;
  const discountAmount = hasDiscount ? originalAmount - amountNumber : 0;

  const isCrypto = payWay === 'usdt' || payWay === 'c2coin';
  const cryptoConfig = CRYPTO_CONFIG[payWay];

  return (
    <Modal
      title={
        <div className='flex items-center gap-2'>
          {isCrypto ? (
            <Coins size={20} color={payWay === 'usdt' ? '#26A17B' : '#8B5CF6'} />
          ) : (
            <CreditCard className='mr-2' size={18} />
          )}
          {isCrypto ? cryptoConfig.unit + ' ' + t('充值') : t('充值确认')}
        </div>
      }
      visible={open}
      onOk={onlineTopUp}
      onCancel={handleCancel}
      maskClosable={false}
      size={isCrypto ? 'medium' : 'small'}
      centered
      confirmLoading={confirmLoading}
      okText={isCrypto ? '我已转账，提交订单' : undefined}
    >
      <div className='space-y-4'>
        {isCrypto && cryptoConfig && (
          <Card className='!rounded-xl !border-0 bg-emerald-50 dark:bg-emerald-900/20'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <Text strong className='text-slate-700 dark:text-slate-200'>
                  收款网络
                </Text>
                <span className='px-2 py-0.5 rounded text-xs font-medium'
                  style={{
                    backgroundColor: payWay === 'usdt'
                      ? 'rgba(22, 163, 74, 0.15)'
                      : 'rgba(139, 92, 246, 0.15)',
                    color: payWay === 'usdt' ? '#16a34a' : '#8B5CF6',
                  }}
                >
                  {cryptoConfig.networkLabel}
                </span>
              </div>

              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <Text strong className='text-slate-700 dark:text-slate-200'>
                    收款地址
                  </Text>
                  <CopyBtn text={cryptoConfig.address} label="address" />
                </div>
                <div
                  className="font-mono text-xs break-all p-2.5 rounded-lg select-all"
                  style={{
                    backgroundColor: 'var(--semi-color-fill-0)',
                    border: '1px solid var(--semi-color-border)',
                    color: 'var(--semi-color-text-1)',
                  }}
                >
                  {cryptoConfig.address}
                </div>
              </div>

              {payWay === 'c2coin' && cryptoConfig.contractAddress && (
                <div>
                  <div className='flex items-center justify-between mb-1.5'>
                    <Text strong className='text-slate-700 dark:text-slate-200'>
                      合约地址
                    </Text>
                    <CopyBtn text={cryptoConfig.contractAddress} label="contract" />
                  </div>
                  <div
                    className="font-mono text-xs break-all p-2.5 rounded-lg select-all"
                    style={{
                      backgroundColor: 'var(--semi-color-fill-0)',
                      border: '1px solid var(--semi-color-border)',
                      color: 'var(--semi-color-text-1)',
                    }}
                  >
                    {cryptoConfig.contractAddress}
                  </div>
                </div>
              )}

              <div className='text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg'>
                {cryptoConfig.instructions}
                <br />
                <a
                  href={cryptoConfig.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline mt-1 inline-block"
                  style={{ color: 'var(--semi-color-primary)' }}
                >
                  在区块浏览器中查看 ↗
                </a>
              </div>
            </div>
          </Card>
        )}

        <Card className='!rounded-xl !border-0 bg-slate-50 dark:bg-slate-800'>
          <div className='space-y-3'>
            <div className='flex justify-between items-center'>
              <Text strong className='text-slate-700 dark:text-slate-200'>
                {t('充值数量')}：
              </Text>
              <Text className='text-slate-900 dark:text-slate-100'>
                {renderQuotaWithAmount(topUpCount)}
                {payWay === 'c2coin' && c2coinExchangeRate && (
                  <span className='text-slate-400 dark:text-slate-500 ml-1 text-xs'>
                    (~{Math.round(topUpCount * 100 / c2coinExchangeRate) / 100} USDT)
                  </span>
                )}
              </Text>
            </div>
            <div className='flex justify-between items-center'>
              <Text strong className='text-slate-700 dark:text-slate-200'>
                {t('实付金额')}：
              </Text>
              {amountLoading ? (
                <Skeleton.Title style={{ width: '60px', height: '16px' }} />
              ) : (
                <div className='flex items-baseline space-x-2'>
                  <Text strong className='font-bold' style={{ color: 'red' }}>
                    {renderAmount()}
                  </Text>
                  {hasDiscount && (
                    <Text size='small' className='text-rose-500'>
                      {Math.round(discountRate * 100)}%
                    </Text>
                  )}
                </div>
              )}
            </div>
            {hasDiscount && !amountLoading && (
              <>
                <div className='flex justify-between items-center'>
                  <Text className='text-slate-500 dark:text-slate-400'>
                    {t('原价')}：
                  </Text>
                  <Text delete className='text-slate-500 dark:text-slate-400'>
                    {`$${originalAmount.toFixed(2)}`}
                  </Text>
                </div>
                <div className='flex justify-between items-center'>
                  <Text className='text-slate-500 dark:text-slate-400'>
                    {t('优惠')}：
                  </Text>
                  <Text className='text-emerald-600 dark:text-emerald-400'>
                    {`- $${discountAmount.toFixed(2)}`}
                  </Text>
                </div>
              </>
            )}
            <div className='flex justify-between items-center'>
              <Text strong className='text-slate-700 dark:text-slate-200'>
                {t('支付方式')}：
              </Text>
              <div className='flex items-center'>
                {(() => {
                  const payMethod = payMethods.find(
                    (method) => method.type === payWay,
                  );
                  if (payMethod) {
                    return (
                      <>
                        {payMethod.type === 'alipay' ? (
                          <SiAlipay className='mr-2' size={16} color='#1677FF' />
                        ) : payMethod.type === 'wxpay' ? (
                          <SiWechat className='mr-2' size={16} color='#07C160' />
                        ) : payMethod.type === 'stripe' ? (
                          <SiStripe className='mr-2' size={16} color='#635BFF' />
                        ) : payMethod.icon ? (
                          <img src={payMethod.icon} alt={payMethod.name} className='mr-2'
                            style={{ width: 16, height: 16, objectFit: 'contain' }} />
                        ) : (
                          <CreditCard className='mr-2' size={16}
                            color={payMethod.color || 'var(--semi-color-text-2)'} />
                        )}
                        <Text className='text-slate-900 dark:text-slate-100'>
                          {payMethod.name}
                        </Text>
                      </>
                    );
                  } else {
                    if (payWay === 'alipay') {
                      return (
                        <><SiAlipay className='mr-2' size={16} color='#1677FF' />
                          <Text className='text-slate-900 dark:text-slate-100'>{t('支付宝')}</Text></>
                      );
                    } else if (payWay === 'stripe') {
                      return (
                        <><SiStripe className='mr-2' size={16} color='#635BFF' />
                          <Text className='text-slate-900 dark:text-slate-100'>Stripe</Text></>
                      );
                    } else {
                      return (
                        <><SiWechat className='mr-2' size={16} color='#07C160' />
                          <Text className='text-slate-900 dark:text-slate-100'>{t('微信')}</Text></>
                      );
                    }
                  }
                })()}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Modal>
  );
};

export default PaymentConfirmModal;

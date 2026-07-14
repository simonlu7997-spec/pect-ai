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

import React, { useEffect, useState, useRef } from 'react';
import { Banner, Button, Form, Row, Col, Spin } from '@douyinfe/semi-ui';
import { API, showError, showSuccess } from '../../../helpers';
import { useTranslation } from 'react-i18next';

export default function SettingsPaymentGatewayC2Coin(props) {
  const { t } = useTranslation();
  const sectionTitle = props.hideSectionTitle ? undefined : t('C2-Coin 设置');
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    C2CoinEnabled: false,
    C2CoinContractAddr: '0x5A8a8586A4defba35F066382e3f71273943EFb0E',
    C2CoinNetwork: 'Polygon Amoy',
    C2CoinExchangeRate: 100,
    C2CoinMinTopUp: 100,
    C2CoinInstructions: 'Send the exact C2Coin amount to the address shown. The tokens will be burned upon confirmation.',
    C2CoinBurnAddress: '0x000000000000000000000000000000000000dEaD',
  });
  const [originInputs, setOriginInputs] = useState({});
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        C2CoinEnabled: props.options.C2CoinEnabled === 'true' || props.options.C2CoinEnabled === true,
        C2CoinContractAddr: props.options.C2CoinContractAddr || '0x5A8a8586A4defba35F066382e3f71273943EFb0E',
        C2CoinNetwork: props.options.C2CoinNetwork || 'Polygon Amoy',
        C2CoinExchangeRate: parseInt(props.options.C2CoinExchangeRate) || 100,
        C2CoinMinTopUp: parseInt(props.options.C2CoinMinTopUp) || 100,
        C2CoinInstructions: props.options.C2CoinInstructions || '',
        C2CoinBurnAddress: props.options.C2CoinBurnAddress || '0x000000000000000000000000000000000000dEaD',
      };
      setInputs(currentInputs);
      setOriginInputs({ ...currentInputs });
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submitC2CoinSettings = async () => {
    setLoading(true);
    try {
      const options = [
        { key: 'C2CoinEnabled', value: String(inputs.C2CoinEnabled) },
        { key: 'C2CoinContractAddr', value: inputs.C2CoinContractAddr },
        { key: 'C2CoinNetwork', value: inputs.C2CoinNetwork },
        { key: 'C2CoinExchangeRate', value: String(inputs.C2CoinExchangeRate) },
        { key: 'C2CoinMinTopUp', value: String(inputs.C2CoinMinTopUp) },
        { key: 'C2CoinInstructions', value: inputs.C2CoinInstructions },
        { key: 'C2CoinBurnAddress', value: inputs.C2CoinBurnAddress },
      ];

      const changedOptions = options.filter((option) => {
        const origin = originInputs[option.key];
        const current = option.value;
        return String(origin) !== String(current);
      });

      if (changedOptions.length === 0) {
        showSuccess(t('保存成功'));
        setLoading(false);
        return;
      }

      const results = await Promise.all(
        changedOptions.map((option) =>
          API.put('/api/option/', {
            key: option.key,
            value: option.value,
          }),
        ),
      );

      const errorResults = results.filter((res) => !res.data.success);
      if (errorResults.length === 0) {
        showSuccess(t('保存成功'));
        setOriginInputs({ ...inputs });
        props.refresh && props.refresh();
      } else {
        errorResults.forEach((res) => {
          showError(res.data.message);
        });
      }
    } catch (error) {
      showError(t('保存失败'));
    }
    setLoading(false);
  };

  return (
    <Spin spinning={loading}>
      <Form
        initValues={inputs}
        onValueChange={handleFormChange}
        getFormApi={(api) => (formApiRef.current = api)}
      >
        <Form.Section text={sectionTitle}>
          <Banner
            type='info'
            description={t(
              'C2-Coin 充值基于 Polygon Amoy 测试网。用户将 C2-Coin 发送到指定合约地址后，系统确认到账并将代币发送到黑洞地址销毁。结算比例为 1 USDT = 100 C2-Coin。',
            )}
            closeIcon={null}
            style={{ marginBottom: 16 }}
          />

          <Form.Switch
            field='C2CoinEnabled'
            label={t('启用 C2-Coin 充值')}
            checkedText={t('开')}
            uncheckedText={t('关')}
            extraText={t('开启后用户可在钱包页面选择 C2-Coin 方式进行充值')}
          />

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Input
                field='C2CoinContractAddr'
                label={t('合约地址')}
                placeholder={'0x5A8a8586A4defba35F066382e3f71273943EFb0E'}
                extraText={t('C2-Coin 在 Polygon Amoy 上的合约地址')}
              />
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Input
                field='C2CoinBurnAddress'
                label={t('黑洞地址')}
                placeholder={'0x0000...dEaD'}
                extraText={t('收到 C2-Coin 后转入此地址销毁')}
              />
            </Col>
          </Row>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Input
                field='C2CoinNetwork'
                label={t('网络')}
                placeholder={'Polygon Amoy'}
                extraText={t('代币所在的网络，如 Polygon Amoy')}
              />
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.InputNumber
                field='C2CoinExchangeRate'
                label={t('兑换比例（1 USDT = ? C2-Coin）')}
                step={1}
                min={1}
                extraText={t('默认 100，即 1 USDT = 100 C2-Coin')}
              />
            </Col>
          </Row>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.InputNumber
                field='C2CoinMinTopUp'
                label={t('最低充值数量（C2-Coin）')}
                step={1}
                min={1}
                extraText={t('用户每次 C2-Coin 充值的最低数量，默认 100')}
              />
            </Col>
          </Row>

          <Form.TextArea
            field='C2CoinInstructions'
            label={t('充值说明（显示给用户）')}
            placeholder={t('请填写用户充值时的操作说明')}
            autosize
            extraText={t('用户在提交 C2-Coin 充值订单后看到的操作指引')}
          />

          <Button onClick={submitC2CoinSettings} style={{ marginTop: 16 }}>
            {t('保存 C2-Coin 设置')}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}

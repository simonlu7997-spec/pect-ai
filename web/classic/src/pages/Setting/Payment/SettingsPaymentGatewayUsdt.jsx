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

export default function SettingsPaymentGatewayUsdt(props) {
  const { t } = useTranslation();
  const sectionTitle = props.hideSectionTitle ? undefined : t('USDT 设置');
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    UsdtEnabled: false,
    UsdtNetwork: 'TRC20',
    UsdtAddress: '',
    UsdtUnitPrice: 1.0,
    UsdtMinTopUp: 1,
    UsdtInstructions: '',
  });
  const [originInputs, setOriginInputs] = useState({});
  const formApiRef = useRef(null);

  useEffect(() => {
    if (props.options && formApiRef.current) {
      const currentInputs = {
        UsdtEnabled: props.options.UsdtEnabled === 'true' || props.options.UsdtEnabled === true,
        UsdtNetwork: props.options.UsdtNetwork || 'TRC20',
        UsdtAddress: props.options.UsdtAddress || '',
        UsdtUnitPrice: parseFloat(props.options.UsdtUnitPrice) || 1.0,
        UsdtMinTopUp: parseInt(props.options.UsdtMinTopUp) || 1,
        UsdtInstructions: props.options.UsdtInstructions || '',
      };
      setInputs(currentInputs);
      setOriginInputs({ ...currentInputs });
      formApiRef.current.setValues(currentInputs);
    }
  }, [props.options]);

  const handleFormChange = (values) => {
    setInputs(values);
  };

  const submitUsdtSettings = async () => {
    setLoading(true);
    try {
      const options = [
        { key: 'UsdtEnabled', value: String(inputs.UsdtEnabled) },
        { key: 'UsdtNetwork', value: inputs.UsdtNetwork },
        { key: 'UsdtAddress', value: inputs.UsdtAddress },
        { key: 'UsdtUnitPrice', value: String(inputs.UsdtUnitPrice) },
        { key: 'UsdtMinTopUp', value: String(inputs.UsdtMinTopUp) },
        { key: 'UsdtInstructions', value: inputs.UsdtInstructions },
      ];

      // Only submit changed values
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
              'USDT 充值由系统创建待处理订单，用户转账后需联系管理员在充值列表中确认到账。请务必配置正确的收款地址并提醒用户核对网络和金额。',
            )}
            closeIcon={null}
            style={{ marginBottom: 16 }}
          />

          <Form.Switch
            field='UsdtEnabled'
            label={t('启用 USDT 充值')}
            checkedText={t('开')}
            uncheckedText={t('关')}
            extraText={t('开启后用户可在钱包页面选择 USDT 方式进行充值')}
          />

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Input
                field='UsdtNetwork'
                label={t('网络')}
                placeholder={'TRC20'}
                extraText={t('常见值：TRC20，请保持与收款地址网络一致')}
              />
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.Input
                field='UsdtAddress'
                label={t('收款地址')}
                placeholder={t('请输入 USDT 收款地址')}
                extraText={t('用户将 USDT 转入此地址')}
              />
            </Col>
          </Row>

          <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.InputNumber
                field='UsdtUnitPrice'
                label={t('USDT 单价（1 USDT = ? USD 额度）')}
                step={0.01}
                min={0}
                extraText={t('设为 1 表示 1 USDT = 1 USD 额度（乘以分组倍率和折扣后）')}
              />
            </Col>
            <Col xs={24} sm={24} md={12} lg={12} xl={12}>
              <Form.InputNumber
                field='UsdtMinTopUp'
                label={t('最低充值数量')}
                step={1}
                min={1}
                extraText={t('用户每次 USDT 充值的最低数量')}
              />
            </Col>
          </Row>

          <Form.TextArea
            field='UsdtInstructions'
            label={t('充值说明（显示给用户）')}
            placeholder={t('请填写用户充值时的操作说明')}
            autosize
            extraText={t('用户在提交 USDT 充值订单后看到的操作指引')}
          />

          <Button onClick={submitUsdtSettings} style={{ marginTop: 16 }}>
            {t('保存 USDT 设置')}
          </Button>
        </Form.Section>
      </Form>
    </Spin>
  );
}

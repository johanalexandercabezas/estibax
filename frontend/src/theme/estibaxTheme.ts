import type { ThemeConfig } from 'antd';
import { theme as antdTheme } from 'antd';

/**
 * Tema corporativo EstibaX / ICOLTRANS (Industria Colombiana de Logística y Transporte).
 * Paleta: verde corporativo #16A34A sobre fondo #F8FAFC, texto #0F172A, peligro #DC2626.
 * Referencia de diseño: minimalista moderno, tarjetas radius 12px, sombras suaves.
 */

export const COLORES = {
  primary: '#16A34A',
  primaryHover: '#15803D',
  primaryBg: '#F0FDF4',
  fondo: '#F8FAFC',
  superficie: '#FFFFFF',
  texto: '#0F172A',
  textoSecundario: '#475569',
  borde: '#E2E8F0',
  peligro: '#DC2626',
  advertencia: '#D97706',
  info: '#2563EB',
  exito: '#16A34A',
  siderBg: '#0F172A',
} as const;

export const estibaxTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: COLORES.primary,
    colorInfo: COLORES.info,
    colorSuccess: COLORES.exito,
    colorWarning: COLORES.advertencia,
    colorError: COLORES.peligro,
    colorBgBase: COLORES.fondo,
    colorBgContainer: COLORES.superficie,
    colorTextBase: COLORES.texto,
    colorBorder: COLORES.borde,
    colorBorderSecondary: '#EEF2F7',
    borderRadius: 12,
    fontFamily:
      "'Segoe UI', 'Inter', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif",
    fontSize: 14,
    controlHeight: 38,
    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
    boxShadowSecondary: '0 4px 16px rgba(15, 23, 42, 0.10)',
  },
  components: {
    Layout: {
      siderBg: COLORES.siderBg,
      headerBg: COLORES.superficie,
      bodyBg: COLORES.fondo,
      headerHeight: 64,
    },
    Menu: {
      darkItemBg: 'transparent',
      darkItemSelectedBg: COLORES.primary,
      darkItemSelectedColor: '#FFFFFF',
      darkItemColor: '#94A3B8',
      darkItemHoverColor: '#FFFFFF',
      itemBorderRadius: 10,
      itemMarginInline: 10,
      itemHeight: 42,
      groupTitleColor: '#64748B',
      groupTitleFontSize: 11,
    },
    Table: {
      headerBg: '#F1F5F9',
      headerColor: COLORES.texto,
      rowHoverBg: COLORES.primaryBg,
      borderColor: '#EEF2F7',
      cellPaddingBlock: 14,
      headerBorderRadius: 12,
    },
    Card: {
      boxShadowTertiary: '0 1px 3px rgba(15, 23, 42, 0.06)',
      paddingLG: 20,
    },
    Button: {
      controlHeight: 38,
      primaryShadow: '0 2px 6px rgba(22, 163, 74, 0.35)',
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 28,
    },
    Modal: {
      borderRadiusLG: 16,
    },
    Tag: {
      borderRadiusSM: 8,
    },
    Segmented: {
      itemSelectedBg: COLORES.primaryBg,
      itemSelectedColor: COLORES.primaryHover,
    },
    Input: { controlHeight: 38 },
    Select: { controlHeight: 38 },
    DatePicker: { controlHeight: 38 },
  },
};

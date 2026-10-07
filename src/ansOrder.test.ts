import { describe, expect, it } from 'vitest';
import { ansOrderStatus, ansOrderWarning, formatAnsOrder, parseAnsOrder } from './ansOrder';
import type { Face } from './faces';

const face = (name: string, ext: string): Face => ({ url: `/face/${name}.${ext}`, name });
const 甲 = face('甲', 'png');
const 乙 = face('乙', 'jpg');
const strange = face('Dr. Strange', 'webp');
const faces = [甲, 乙, strange];

const names = (md: string) => parseAnsOrder(md, faces).order?.map((f) => f.name) ?? null;

describe('parseAnsOrder', () => {
  it('空字串 → 隨機模式', () => {
    expect(parseAnsOrder('', faces)).toEqual({ order: null, missing: [] });
  });

  it('只有標題和空行、沒有清單項目 → 隨機模式', () => {
    expect(parseAnsOrder('# 答案順序\n\n  \n', faces)).toEqual({ order: null, missing: [] });
  });

  it('照清單行的先後出題，行首題號只是給人看的', () => {
    expect(names('3. 乙.jpg\n1. 甲.png')).toEqual(['乙', '甲']);
  });

  it('副檔名可寫可不寫、大小寫不拘', () => {
    expect(names('1. 甲\n2. 乙.JPG')).toEqual(['甲', '乙']);
  });

  it('名字本身有點也對得到', () => {
    expect(names('1. Dr. Strange\n2. Dr. Strange.webp')).toEqual(['Dr. Strange', 'Dr. Strange']);
  });

  it('標題、說明文字、非清單行都忽略', () => {
    expect(names('# 答案順序\n主持人用\n- 乙\n1. 甲')).toEqual(['甲']);
  });

  it('沒寫到的照片不出題', () => {
    expect(names('1. 乙')).toEqual(['乙']);
  });

  it('重複的名字照樣出兩次', () => {
    expect(names('1. 甲\n2. 乙\n3. 甲')).toEqual(['甲', '乙', '甲']);
  });

  it('容忍 CRLF 與前後空白', () => {
    expect(names('  1.   甲  \r\n2.乙\r\n')).toEqual(['甲', '乙']);
  });

  it('找不到的名字跳過，記下它是第幾題（清單中的位置）', () => {
    expect(parseAnsOrder('1. 甲\n\n2. Kenyy\n3. 乙', faces)).toEqual({
      order: [甲, 乙],
      missing: [{ position: 2, name: 'Kenyy' }],
    });
  });

  it('全部都找不到 → 退回隨機模式，但保留警告', () => {
    expect(parseAnsOrder('1. 路人', faces)).toEqual({
      order: null,
      missing: [{ position: 1, name: '路人' }],
    });
  });
});

describe('ansOrderWarning', () => {
  it('沒有問題時為空字串', () => {
    expect(ansOrderWarning({ order: [甲], missing: [] })).toBe('');
    expect(ansOrderWarning({ order: null, missing: [] })).toBe('');
  });

  it('列出找不到的題目，並提醒題號往前移', () => {
    expect(
      ansOrderWarning({
        order: [甲],
        missing: [
          { position: 2, name: 'Kenyy' },
          { position: 5, name: '小祐' },
        ],
      }),
    ).toBe('ans_order.md 第 2 題「Kenyy」、第 5 題「小祐」找不到照片，已跳過，之後的題號會往前移');
  });

  it('全部找不到時說明改成隨機出題', () => {
    expect(ansOrderWarning({ order: null, missing: [{ position: 1, name: '路人' }] })).toBe(
      'ans_order.md 第 1 題「路人」找不到照片，改成隨機出題',
    );
  });
});

describe('formatAnsOrder', () => {
  it('標題加上有序清單，每個檔名一行', () => {
    expect(formatAnsOrder(['乙.jpg', '甲.png'])).toBe('# 答案順序\n\n1. 乙.jpg\n2. 甲.png\n');
  });

  it('產生的內容能被 parseAnsOrder 原樣讀回', () => {
    const md = formatAnsOrder(['Dr. Strange.webp', '甲.png', '乙.jpg']);
    expect(names(md)).toEqual(['Dr. Strange', '甲', '乙']);
  });
});

describe('ansOrderStatus', () => {
  // 本機時間 10/07 22:31
  const updatedMs = new Date(2026, 9, 7, 22, 31, 45).getTime();

  it('檔案不存在', () => {
    expect(ansOrderStatus(null, parseAnsOrder('', faces))).toBe(
      '還沒有 ans_order.md，遊戲會隨機出題',
    );
  });

  it('檔案存在但沒有清單', () => {
    expect(ansOrderStatus(updatedMs, parseAnsOrder('# 答案順序\n', faces))).toBe(
      'ans_order.md 是空的（更新於 10/07 22:31），遊戲會隨機出題',
    );
  });

  it('有清單：題數只算找得到照片的', () => {
    expect(ansOrderStatus(updatedMs, parseAnsOrder('1. 甲\n2. Kenyy\n3. 乙', faces))).toBe(
      'ans_order.md 共 2 題，更新於 10/07 22:31，遊戲照這個順序出題',
    );
  });

  it('有清單但全部找不到照片', () => {
    expect(ansOrderStatus(updatedMs, parseAnsOrder('1. 路人', faces))).toBe(
      'ans_order.md 的題目都找不到照片（更新於 10/07 22:31），遊戲會隨機出題',
    );
  });

  it('月、日、時、分不足兩位補 0', () => {
    const early = new Date(2026, 0, 5, 9, 3).getTime();
    expect(ansOrderStatus(early, parseAnsOrder('', faces))).toBe(
      'ans_order.md 是空的（更新於 01/05 09:03），遊戲會隨機出題',
    );
  });
});

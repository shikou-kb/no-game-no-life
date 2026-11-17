// Extracted from growth-system-proposal.md v0.27-v0.28. Trial budgets, not empirical learning times.
export const TEMPLATES = {
  "reasoning": {
    "id": "reasoning",
    "name": "理解与解题",
    "purpose": "把知识讲明白，用来解决问题",
    "version": "trial-33-v0.28",
    "stages": [
      {
        "name": "理解基础",
        "standard": "能用自己的话解释关键概念，分清适用条件。",
        "q": 90.0,
        "levels": 15
      },
      {
        "name": "独立处理常规问题",
        "standard": "面对熟悉类型，能选择方法完成，并说明理由。",
        "q": 96.0,
        "levels": 35
      },
      {
        "name": "分析变式",
        "standard": "条件变化时能识别原方法的限制，调整解决方法。",
        "q": 102.0,
        "levels": 65
      },
      {
        "name": "综合迁移",
        "standard": "在新问题中组合所学、检查结论，说明适用边界。",
        "q": 108.0,
        "levels": 110
      }
    ]
  },
  "control": {
    "id": "control",
    "name": "操作与控制",
    "purpose": "把动作与操作做得稳定、准确",
    "version": "trial-33-v0.28",
    "stages": [
      {
        "name": "完成基本动作",
        "standard": "能在允许的提示下完成关键动作，识别明显失误。",
        "q": 90.0,
        "levels": 15
      },
      {
        "name": "连贯完成",
        "standard": "能把动作串成完整流程，减少中断与依赖提示。",
        "q": 96.0,
        "levels": 42
      },
      {
        "name": "稳定精准",
        "standard": "在自定目标条件下反复保持准确、连贯和质量。",
        "q": 102.0,
        "levels": 91
      },
      {
        "name": "复杂条件下灵活控制",
        "standard": "面对更复杂材料或条件，仍能调整动作并保持质量。",
        "q": 108.0,
        "levels": 172
      }
    ]
  },
  "build": {
    "id": "build",
    "name": "制作与构建",
    "purpose": "做出可用、可靠、可维护的工具或成果",
    "version": "trial-33-v0.28",
    "stages": [
      {
        "name": "单功能可用",
        "standard": "能独立完成一项明确功能，并检查它是否解决了需求。",
        "q": 90.0,
        "levels": 22
      },
      {
        "name": "完整流程",
        "standard": "能组合多个步骤或部分，完成从输入到结果的全过程。",
        "q": 94.5,
        "levels": 28
      },
      {
        "name": "稳定可靠",
        "standard": "在所选输入变化和常见异常下，能保持结果可信并定位问题。",
        "q": 99.0,
        "levels": 34
      },
      {
        "name": "适配与维护",
        "standard": "需求或条件变化时，能修改已有方案并核对影响。",
        "q": 103.5,
        "levels": 39
      },
      {
        "name": "自主设计与优化",
        "standard": "面对新需求能比较方案、组织实现，解释取舍并改进。",
        "q": 108.0,
        "levels": 74
      }
    ]
  },
  "expression": {
    "id": "expression",
    "name": "创作与表达",
    "purpose": "把想法变成完整作品，逐渐自由表达",
    "version": "trial-33-v0.28",
    "stages": [
      {
        "name": "基础表达",
        "standard": "能用基本技法表达一个清楚的片段、形象或意思。",
        "q": 90.0,
        "levels": 30
      },
      {
        "name": "完整作品",
        "standard": "能组织成有起伏、结构或主旨的完整成果。",
        "q": 93.6,
        "levels": 85
      },
      {
        "name": "独立处理新素材",
        "standard": "不依赖逐步照做，能处理未练过的素材或要求。",
        "q": 97.2,
        "levels": 204
      },
      {
        "name": "有意识编排",
        "standard": "能为表达目的选择、组合和修改表现手段，并说明理由。",
        "q": 100.8,
        "levels": 393
      },
      {
        "name": "驾驭复杂表达",
        "standard": "面对所选风格中的高难要求，能兼顾技术与表达效果。",
        "q": 104.4,
        "levels": 569
      },
      {
        "name": "自由整合与个人表达",
        "standard": "能在新意图或材料下自主整合技法、发展想法并形成连贯表达。",
        "q": 108.0,
        "levels": 612
      }
    ]
  },
  "interaction": {
    "id": "interaction",
    "name": "交流与决策",
    "purpose": "在互动与变化中观察、选择和调整",
    "version": "trial-33-v0.28",
    "stages": [
      {
        "name": "熟悉情境回应",
        "standard": "能识别基本情境，作出与当前目标有关的回应。",
        "q": 90.0,
        "levels": 22
      },
      {
        "name": "独立完成互动",
        "standard": "能持续交流或完成决策过程，遇到普通问题能继续推进。",
        "q": 94.5,
        "levels": 49
      },
      {
        "name": "应对变化",
        "standard": "对方或局面变化时，能识别信号并调整回应。",
        "q": 99.0,
        "levels": 94
      },
      {
        "name": "复杂权衡",
        "standard": "信息不完整或目标冲突时，能比较选择、说明取舍并调整。",
        "q": 103.5,
        "levels": 154
      },
      {
        "name": "跨情境稳定应对",
        "standard": "在不同材料、对象或局面中，能稳定运用和修正策略。",
        "q": 108.0,
        "levels": 220
      }
    ]
  },
  "physical": {
    "id": "physical",
    "name": "体能与身体表现",
    "purpose": "围绕个人目标保留可比较的身体表现",
    "version": "trial-33-v0.28",
    "stages": [
      {
        "name": "建立起点与基础",
        "standard": "能在可比较条件下描述当前表现，并完成适合目标的基础实践。",
        "q": 90.0,
        "levels": 15
      },
      {
        "name": "稳定完成目标",
        "standard": "能稳定完成自己选择的基础目标，条件与记录口径清楚。",
        "q": 96.0,
        "levels": 35
      },
      {
        "name": "提升专项表现",
        "standard": "围绕所选能力取得可回看的进步，而不是只累计活动时长。",
        "q": 102.0,
        "levels": 65
      },
      {
        "name": "更高要求下稳定保持",
        "standard": "在提高后的个人目标条件下保持表现，并辨认状态变化。",
        "q": 108.0,
        "levels": 98
      }
    ]
  },
  "integrated": {
    "id": "integrated",
    "name": "综合实践",
    "purpose": "协调多个方面，完成整体实践",
    "version": "trial-33-v0.28",
    "stages": [
      {
        "name": "完成基础任务",
        "standard": "能完成所选综合目标中的一个基础任务，知道主要环节。",
        "q": 90.0,
        "levels": 22
      },
      {
        "name": "独立完成全过程",
        "standard": "能自行组织相关环节，完成一次完整实践。",
        "q": 94.5,
        "levels": 49
      },
      {
        "name": "稳定达到目标",
        "standard": "能在常见条件下重复达到自己说明的结果与质量。",
        "q": 99.0,
        "levels": 94
      },
      {
        "name": "适应变化",
        "standard": "目标、材料或条件变化时，能调整不同环节。",
        "q": 103.5,
        "levels": 141
      },
      {
        "name": "自主整合改进",
        "standard": "能协调不同能力与资源，解释取舍并持续改进整体结果。",
        "q": 108.0,
        "levels": 196
      }
    ]
  }
};

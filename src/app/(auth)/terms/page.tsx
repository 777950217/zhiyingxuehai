import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[#2B7DE9] hover:underline mb-6 text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">用户服务协议</h1>
        <p className="text-sm text-gray-500 mb-8">
          服务提供方：职盈学海（品牌）/ 创始人（个人经营者）<br />
          生效日期：2026年06月01日
        </p>

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 space-y-8 text-gray-800 leading-relaxed text-[15px]">
          {/* 第一章：服务说明 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">一、服务说明</h2>
            <div className="space-y-3">
              <p><strong>1.1</strong> 本平台为线上知识学习与管理工具服务平台，由职盈学海（品牌）/ 创始人（个人经营者）运营，向用户提供：在线课程、培训体系、实操模板、管理SOP、客服质检工具、KPI核算工具、排班工具、成本预警工具、AI辅助办公等线上数字化服务（以下统称"本服务"）。</p>
              <p><strong>1.2</strong> 平台分为个人版、专业版、旗舰版，各版本功能范围及对应价格以平台页面展示为准。用户订阅相应版本后，在服务期内享有该版本对应功能的使用权。</p>
              <p><strong>1.3</strong> 平台有权根据业务发展需要，对服务内容进行更新、优化或调整，但不会实质性地降低用户已购版本的核心功能。</p>
              <p><strong>1.4 版本定价锁死承诺</strong>：职盈学海承诺当前四个版本（个人版、专业版、旗舰版）的定价体系及功能范围在用户订阅期内不作调整。用户按当前价格订阅后，在有效服务期内不会因版本升级或功能增加而被要求补差价，也不会因功能范围调整而降低已享有权限。</p>
            </div>
          </section>

          {/* 第二章：课程内容与服务标准（新增） */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">二、课程内容与服务标准</h2>
            <div className="space-y-3">
              <p><strong>2.1 课程体系</strong>：本平台提供25课系统化课程内容，涵盖角色认知、目标管理、团队带教、业务落地四大模块，课程内容每季度更新一次，确保与行业实践保持同步。</p>
              <p><strong>2.2 使用时长</strong>：用户在服务期内可无限次访问和使用课程内容，不受学习次数限制。</p>
              <p><strong>2.3 服务可用性</strong>：平台年可用率不低于99%，如因计划维护需暂停服务，我们将提前24小时通知用户。</p>
              <p><strong>2.4 售后响应</strong>：我们提供售后24小时响应服务，用户通过平台内帮助中心或联系邮箱提交的问题，将在24小时内获得初步响应。</p>
            </div>
          </section>

          {/* 第三章：故障修复与服务保障（新增） */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">三、故障修复与服务保障</h2>
            <div className="space-y-3">
              <p><strong>3.1 故障分级与修复时限</strong>：平台对服务故障实行分级响应与修复机制：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>一般故障</strong>（部分功能异常但不影响核心使用）：48小时内修复</li>
                <li><strong>严重故障</strong>（核心功能不可用）：24小时内修复</li>
                <li><strong>紧急故障</strong>（全部服务不可用或数据安全风险）：12小时内修复</li>
              </ul>
              <p><strong>3.2 服务中断补偿</strong>：如因平台自身系统故障导致服务中断超过连续72小时，用户可申请按剩余服务天数等比例延长服务期限。申请方式：通过平台内帮助中心或联系邮箱提交申请，我们将在5个工作日内核实并处理。</p>
              <p><strong>3.3 维护通知</strong>：计划性维护将提前24小时通过平台内通知告知用户；紧急维护将在恢复服务后24小时内说明原因和影响范围。</p>
              <p><strong>3.4 分级服务可用性承诺（SLA）</strong>：平台对不同版本提供分级服务可用性保障：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>个人版</strong>：月度服务可用性不低于 <strong>95%</strong>，即每月累计不可用时长不超过36小时</li>
                <li><strong>专业版</strong>：月度服务可用性不低于 <strong>98%</strong>，即每月累计不可用时长不超过14.4小时</li>
                <li><strong>旗舰版</strong>：月度服务可用性不低于 <strong>99%</strong>，即每月累计不可用时长不超过7.2小时</li>
              </ul>
              <p>服务可用性计算方式：月度可用率 =（月总分钟数 - 非计划停机分钟数）/ 月总分钟数 × 100%。计划维护窗口不计入不可用时长。如未达到对应版本SLA承诺，用户可按本协议第三条第3.2款申请等比例延长服务期限。</p>
            </div>
          </section>

          {/* 第四章：合规与知识产权（原第二章） */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">四、合规与知识产权</h2>
            <div className="space-y-3">
              <p><strong>4.1</strong> 本平台提供的全部课程内容、培训体系、实操模板、管理SOP、工具逻辑等，均为服务方独立原创或经合法授权获得，受《中华人民共和国著作权法》及相关法律法规保护。</p>
              <p><strong>4.2</strong> 用户不得以任何形式复制、翻拍、录屏、传播、分销、二次售卖、搬运本平台内容。一经发现上述行为，平台有权立即封禁违规账号、终止服务，且不予退还任何费用，并保留追究法律责任的权利。</p>
              <p><strong>4.3</strong> 本平台不对用户使用服务后的升职、业绩、收益、学习效果等做任何承诺或保证。平台提供的是学习工具和管理辅助服务，最终效果取决于用户个人的学习能力、执行力和工作环境等多种因素。</p>
            </div>
          </section>

          {/* 第五章：付费与退款（重写） */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">五、付费与退款</h2>
            <div className="space-y-3">
              <p><strong>5.1 退款一般规则</strong>：本平台提供在线数字化服务，属于《消费者权益保护法》第二十五条规定的不适用七天无理由退货的数字化商品。退款政策按版本区分：①<strong>个人版</strong>：因用户自身原因（包括但不限于个人需求变化、学习时间不足、主观不满意等）申请退款的，一律不予退还；②<strong>专业版/旗舰版</strong>：购买后30天内，用户可申请退款，平台扣除500元服务费（含已使用功能对应的成本），余款退还。详细规则见<a href="/refund" className="text-blue-600 hover:underline">退款政策</a>页面。</p>
              <p><strong>5.2 平台问题退款</strong>：如因平台自身系统故障导致用户无法正常使用核心功能，且经核实属于平台责任的，用户可申请全额退款。平台将在核实后5个工作日内处理退款。</p>
              <p><strong>5.3 发票说明</strong>：本平台由个体工商户运营，可开具增值税普通发票，税费1%由客户承担。退款时，已开具发票需退回或缴纳对应税费。</p>
              <p><strong>5.4 服务到期</strong>：服务到期后，如用户未续订，平台有权暂停该账号的付费功能使用权限，但不会删除用户的历史数据。用户可在重新续订后恢复使用。</p>
              <p><strong>5.5 争议解决</strong>：因本协议引起的争议，双方应友好协商；协商不成的，任一方可向潮州市人民法院提起诉讼。</p>
            </div>
          </section>

          {/* 第六章：账号使用规则与责任 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">六、账号使用规则与责任</h2>
            <div className="space-y-3">
              <p><strong>6.1</strong> 用户注册时须提供真实、准确的手机号码等信息，并对账号安全承担全部责任。因用户自身原因（如密码泄露、设备未妥善保管等）导致账号泄露、被盗等，平台不承担相应责任，但将协助用户进行账号找回。</p>
              <p><strong>6.2</strong> 账号仅限本人单人使用，严禁共享、转借、出租、售卖或供多人共用。一经发现，平台有权封禁该账号并终止服务，不予退款。</p>
              <p><strong>6.3</strong> 用户在平台录入的各类工作数据（如员工信息、业绩数据、成本数据等）由用户全权负责其真实性与合法性，平台仅提供数据存储、计算与展示工具服务，不对用户数据内容承担审查或担保责任。</p>
              <p><strong>6.4</strong> 用户因违反本协议或相关法律法规而导致的任何损失，由用户自行承担。</p>
            </div>
          </section>

          {/* 第七章：用户禁止行为 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">七、用户禁止行为</h2>
            <div className="space-y-3">
              <p><strong>7.1</strong> 禁止利用本平台从事任何违反法律法规的活动，包括但不限于传播违法信息、侵犯他人权益等。</p>
              <p><strong>7.2</strong> 禁止通过技术手段攻击、破解、反向工程本平台系统，或干扰平台的正常运行。</p>
              <p><strong>7.3</strong> 禁止复制、翻拍、录屏、传播、分销、二次售卖、搬运本平台的任何课程内容、模板或工具。</p>
              <p><strong>7.4</strong> 禁止在平台内发布虚假信息、垃圾广告、恶意评论或其他干扰其他用户正常使用的行为。</p>
              <p><strong>7.5</strong> 禁止利用平台工具收集、存储、处理他人个人信息而未经授权。用户须确保其录入数据符合相关法律法规要求。</p>
            </div>
          </section>

          {/* 第八章：免责与责任边界 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">八、免责与责任边界</h2>
            <div className="space-y-3">
              <p><strong>8.1</strong> 本平台提供的学习内容和工具仅作辅助参考之用，不构成任何形式的商业建议、法律意见或专业咨询。用户应根据自身情况独立判断和决策。</p>
              <p><strong>8.2 不可抗力免责</strong>：因不可抗力（包括但不限于自然灾害、政策变化、网络攻击等）导致服务中断或数据丢失，平台不承担赔偿责任，但将在合理时间内尽最大努力恢复服务并降低对用户的影响。</p>
              <p><strong>8.3 用户自身过错免责</strong>：因用户自身操作不当、密码泄露、设备问题等用户方原因导致的损失，平台不承担责任，但将在能力范围内提供合理协助。</p>
              <p><strong>8.4 第三方原因免责</strong>：本平台可能包含指向第三方网站或服务的链接，用户访问第三方内容的风险由用户自行承担。因第三方服务变更、中断或数据泄露等导致的损失，平台不承担责任，但将在知悉后及时提醒用户。</p>
              <p><strong>8.5 服务保障承诺</strong>：平台将持续优化技术架构和运维体系，尽力保障服务稳定运行，但不对服务绝对无中断、无故障做承诺。如因平台自身系统故障导致服务中断超过连续72小时，用户可按本协议第三条第3.2款申请等比例延长服务期限。</p>
              <p><strong>8.6 责任底线</strong>：本条免责条款不适用于因平台违法违规操作、故意或重大过失导致用户直接财产损失的情形。在此类情况下，平台依法承担相应责任。</p>
              <p><strong>8.7</strong> 平台不对AI辅助工具生成的内容准确性做绝对保证，AI输出内容仅供用户参考，用户应自行核实后使用。</p>
            </div>
          </section>

          {/* 第九章：知识产权说明 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">九、知识产权说明</h2>
            <div className="space-y-3">
              <p><strong>9.1</strong> 本平台的界面设计、交互逻辑、课程内容、模板体系、品牌标识等全部知识产权归服务方所有，受《中华人民共和国著作权法》等法律法规保护。</p>
              <p><strong>9.2</strong> 本平台所使用的系统开发框架、第三方插件及工具均通过正规商用授权渠道获取，不存在知识产权侵权风险。</p>
              <p><strong>9.3</strong> 未经服务方书面许可，任何单位和个人不得以任何方式复制、修改、传播本平台的任何部分，否则将依法追究其法律责任。</p>
              <p><strong>9.4</strong> 用户在平台内自行创建、录入的内容（如自定义话术、工作数据、笔记等）的知识产权归用户所有。平台仅在提供服务的必要范围内使用这些内容，不会将其用于其他商业目的。</p>
            </div>
          </section>

          {/* 第十章：协议变更规则（更新：提前7天通知） */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">十、协议变更规则</h2>
            <div className="space-y-3">
              <p>服务方有权根据法律法规变化、业务发展需要等原因对本协议进行修订。修订后的协议将在平台页面公布。</p>
              <p>对于重大变更（如服务内容调整、费用结构变更、责任条款修改等），我们将提前7天通过平台内通知或其他合理方式告知您，您有权在变更生效前选择是否继续使用本服务。</p>
              <p>如您在协议修订后继续使用本平台服务，视为您同意修订后的协议。如您不同意修订内容，有权停止使用本平台服务并申请注销账号。</p>
            </div>
          </section>

          {/* 第十一章：争议解决 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">十一、争议解决</h2>
            <div className="space-y-3">
              <p>因本协议或本平台服务引起的或与之相关的任何争议，双方应首先友好协商解决。协商不成的，任何一方均有权向服务方所在地有管辖权的人民法院提起诉讼。</p>
              <p>本协议的订立、执行和解释均适用中华人民共和国法律。</p>
            </div>
          </section>

          {/* 第十二章：联系方式（更新：邮箱） */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">十二、联系方式</h2>
            <div className="space-y-3">
              <p>如您对本协议有任何疑问或需要咨询，可通过以下方式联系我们：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>平台内帮助中心在线反馈</li>
                <li>电子邮箱：1051202571@qq.com</li>
              </ul>
              <p>我们将在收到您的反馈后15个工作日内予以回复。</p>
            </div>
          </section>
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          职盈学海（品牌）/ 创始人（个人经营者）
        </p>
      </div>
    </div>
  );
}

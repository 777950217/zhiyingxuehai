'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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

        <h1 className="text-2xl font-bold text-gray-900 mb-2">隐私政策</h1>
        <p className="text-sm text-gray-500 mb-8">
          服务提供方：职盈学海（品牌）/ 创始人（个人经营者）<br />
          生效日期：2026年06月01日<br />
          依据：《中华人民共和国个人信息保护法》《中华人民共和国网络安全法》《中华人民共和国数据安全法》《网络数据安全管理条例》《数据出境安全评估办法》
        </p>

        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 space-y-8 text-gray-800 leading-relaxed text-[15px]">
          {/* 第一章 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">一、信息收集原则</h2>
            <div className="space-y-3">
              <p>我们严格遵守"合法、正当、必要、最小化"原则收集和使用您的个人信息。我们仅收集为您提供服务所必需的信息，不会收集与服务无关的个人信息，也不会以任何方式强迫您提供非必要信息。</p>
            </div>
          </section>

          {/* 第二章 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">二、我们收集的信息</h2>
            <div className="space-y-3">
              <p><strong>2.1 必要信息</strong>：为向您提供基本服务，我们收集以下必要信息：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>手机号码：用于账号注册、登录验证及安全通知</li>
                <li>昵称/显示名称：用于平台内身份展示与协作</li>
                <li>用户自录入的工作数据：如员工信息、业绩数据、成本数据等，由用户自主录入，我们仅提供存储与展示服务</li>
              </ul>
              <p><strong>2.2 我们绝不收集</strong>以下敏感信息：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>身份证号码、实名认证信息</li>
                <li>银行卡号、支付密码</li>
                <li>通讯录、手机相册</li>
                <li>地理位置信息</li>
                <li>短信内容</li>
                <li>生物识别信息（指纹、面部识别等）</li>
              </ul>
            </div>
          </section>

          {/* 第三章 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">三、信息使用范围</h2>
            <div className="space-y-3">
              <p><strong>3.1</strong> 我们收集的信息仅用于以下目的：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>提供在线学习、培训体系及管理工具服务</li>
                <li>保障账号安全与系统稳定运行</li>
                <li>响应用户的客服与支持请求</li>
              </ul>
              <p><strong>3.2</strong> 我们不会将您的信息用于：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>用户画像</li>
                <li>商业营销或广告推送</li>
                <li>向第三方出售、交易或共享</li>
                <li>与第三方合作进行数据分析或挖掘</li>
              </ul>
            </div>
          </section>

          {/* 第四章 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">四、信息共享与披露</h2>
            <div className="space-y-3">
              <p><strong>4.1</strong> 我们不会售卖、泄露或主动共享您的个人信息给任何第三方。</p>
              <p><strong>4.2</strong> 仅在以下法定情形下，我们可能依法披露您的信息：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>经您事先同意或授权</li>
                <li>根据法律法规规定或行政、司法机关的强制性要求</li>
                <li>为保护服务方及平台其他用户的合法权益所合理必需</li>
              </ul>
            </div>
          </section>

          {/* 第五章 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">五、数据安全保护</h2>
            <div className="space-y-3">
              <p>我们采取以下技术和管理措施保护您的数据安全：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>全站HTTPS加密传输，保障数据传输安全</li>
                <li>多租户数据隔离架构，不同企业数据严格隔离存储</li>
                <li>令牌认证（Token Authentication）机制保护接口访问，定期备份关键数据</li>
                <li>用户数据存储于Supabase云端数据库（由Supabase Inc.提供，服务器位于美国），我们已进行数据出境安全风险评估，并采取加密存储、访问控制等保护措施</li>
              </ul>
            </div>
          </section>

          {/* 第六章 - 更新：数据出境合规说明 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">六、数据出境合规说明</h2>
            <div className="space-y-3">
              <p><strong>6.1 合法性基础</strong>：本平台使用Supabase Inc.（美国）提供的云端数据库服务，用户在平台中录入和产生的数据将存储于Supabase位于美国的数据中心，构成个人信息出境。我们依据《中华人民共和国个人信息保护法》第三十八条的规定，已履行数据出境安全风险评估及相关合规义务，确保数据出境活动合法合规。</p>
              <p><strong>6.2 出境目的与范围</strong>：数据出境仅用于平台核心功能的存储与计算，包括课程学习记录、管理工具数据、账号信息等。我们不会将您的数据用于出境目的之外的其他用途。</p>
              <p><strong>6.3 接收方安全认证</strong>：数据出境的接收方为Supabase Inc.（supabase.com），其已获得以下安全认证与合规资质：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>SOC2 Type II 安全审计认证</li>
                <li>传输加密（TLS 1.2+）与静态数据加密（AES-256）</li>
                <li>ISO 27001 信息安全管理体系认证</li>
                <li>符合欧盟GDPR合规要求</li>
              </ul>
              <p><strong>6.4 持续合规保障</strong>：我们承诺持续关注中国及境外数据保护法律法规的变化，定期评估数据出境的安全风险，并在法律法规要求时及时补充或调整合规措施，确保数据出境活动始终处于合法合规状态。</p>
              <p><strong>6.5 用户权利保障</strong>：我们充分尊重您的知情权和决定权，不会因您行使权利而降低服务质量。如果您对数据出境有疑问或希望了解详情，可随时通过本政策列明的联系方式与我们联系，我们将在15个工作日内予以回复。</p>
            </div>
          </section>

          {/* 第七章 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">七、用户数据权利</h2>
            <div className="space-y-3">
              <p>您对您的个人信息享有以下权利：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>查看权</strong>：您可随时在平台内查看您的个人资料和录入的数据</li>
                <li><strong>导出权</strong>：您可导出您在平台中录入的数据内容</li>
                <li><strong>删除权与注销权</strong>：您可申请删除个人信息或注销账号，具体操作路径为：登录后进入「个人中心」→「账号设置」→「注销账号」，我们将在15个工作日内完成处理</li>
                <li><strong>撤回同意权</strong>：您可随时撤回对个人信息处理的同意，撤回方式同上。撤回同意不影响撤回前基于您的同意已合法进行的个人信息处理活动的效力</li>
              </ul>
              <p><strong>无法删除的例外情形</strong>：根据相关法律法规要求，部分信息在法定留存期限内无法删除，包括但不限于：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>交易记录及财务相关信息（依法需保留不少于3年）</li>
                <li>网络安全日志信息（依法需保留不少于6个月）</li>
              </ul>
              <p>法定留存期限届满后，我们将自动删除或匿名化处理上述信息。</p>
            </div>
          </section>

          {/* 第八章 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">八、团队数据说明</h2>
            <div className="space-y-3">
              <p>对于企业版用户，团队数据管理遵循以下规则：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>不同企业的数据严格私有隔离，企业间不可互访</li>
                <li>企业管理员（主管/老板角色）仅能查看下属成员的学习进度汇总，无法查看成员具体录入的工作数据内容</li>
                <li>我们不会将企业数据对外披露、商用或用于AI模型训练</li>
              </ul>
            </div>
          </section>

          {/* 第九章 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">九、未成年人保护</h2>
            <div className="space-y-3">
              <p><strong>9.1</strong> 本平台面向成年工作者提供服务，不接受未满18周岁的未成年人注册使用。</p>
              <p><strong>9.2</strong> 如果我们发现未成年人在未获得监护人同意的情况下使用本平台，将立即注销其账号并删除相关信息。</p>
              <p><strong>9.3</strong> 我们不会主动收集未成年人的个人信息。如因监护人允许未成年人使用其账号而产生的问题，由监护人承担相应责任。</p>
              <p><strong>9.4</strong> 监护人如发现未成年人未经允许使用本平台，可随时通过本政策列明的联系方式通知我们，我们将在核实后及时处理。</p>
            </div>
          </section>

          {/* 第十章 - 更新：提前7天通知 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">十、政策更新</h2>
            <div className="space-y-3">
              <p>我们可能适时修订本隐私政策。修订后的政策将在平台页面公布。对于重大变更（如信息收集范围扩大、数据出境安排变更等），我们将提前7天通过平台内通知或其他合理方式告知您，您有权在变更生效前选择是否继续使用本服务。</p>
              <p>如您在政策修订后继续使用本平台，视为您同意修订后的内容。如您不同意修订内容，可停止使用本服务并申请注销账号。</p>
            </div>
          </section>

          {/* 第十一章 - 更新：联系邮箱 */}
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">十一、联系渠道</h2>
            <div className="space-y-3">
              <p>如您对本隐私政策有任何疑问或需要行使您的数据权利，可通过以下方式联系我们：</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>平台内帮助中心在线反馈</li>
                <li>电子邮箱：1051202571@qq.com</li>
              </ul>
              <p>我们将在收到您的请求后15个工作日内予以回复和处理。</p>
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

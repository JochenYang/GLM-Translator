<template>
  <div class="documentation-container p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">
      GLM Translator 使用文档
    </h1>

    <div class="space-y-8 text-gray-700">
      <section>
        <h2 class="text-2xl font-semibold mb-4">简介</h2>
        <p class="mb-4">
          GLM Translator
          是一款简洁高效的网页翻译工具，支持多种语言翻译，可以通过划词、右键菜单等方式快速翻译文本。本扩展提供了便捷的接口配置，用户通过填写自己的API密钥即可享受高质量的翻译服务。
        </p>
      </section>

      <section>
        <h2 class="text-2xl font-semibold mb-4">功能特点</h2>
        <ul class="list-disc pl-6 space-y-2">
          <li>多API支持：支持多种大模型翻译服务，用户可自行配置</li>
          <li>划词翻译：选中文本后立即翻译或显示翻译图标</li>
          <li>右键菜单：通过右键菜单快捷翻译选中文本</li>
          <li>多语言支持：支持多种语言互译</li>
          <li>API管理：支持添加、编辑多种翻译服务API配置</li>
          <li>本地存储：所有配置信息存储在本地，保护用户隐私</li>
        </ul>
      </section>

      <section>
        <h2 class="text-2xl font-semibold mb-4">安装与配置</h2>
        <h3 class="text-xl font-medium mt-6 mb-3">安装扩展</h3>
        <p class="mb-4">您可以通过以下方式安装GLM Translator：</p>
        <ol class="list-decimal pl-6 space-y-2 mb-4">
          <li>下载扩展ZIP包并解压</li>
          <li>
            在浏览器中打开扩展管理页面（Edge或Chrome中为<code>edge://extensions</code>或<code>chrome://extensions</code>）
          </li>
          <li>开启"开发者模式"</li>
          <li>点击"加载已解压的扩展程序"，选择解压后的文件夹</li>
        </ol>

        <h3 class="text-xl font-medium mt-6 mb-3">初始设置</h3>
        <p class="mb-2">首次使用时，请按照以下步骤进行设置：</p>
        <ol class="list-decimal pl-6 space-y-2 mb-4">
          <li>点击扩展图标，进入设置页面</li>
          <li>配置API信息，包括API密钥和相关设置</li>
          <li>选择默认源语言和目标语言</li>
          <li>设置划词翻译和触发方式</li>
          <li>点击"保存设置"按钮应用更改</li>
        </ol>
      </section>

      <section>
        <h2 class="text-2xl font-semibold mb-4">使用指南</h2>

        <h3 class="text-xl font-medium mt-6 mb-3">基本设置</h3>
        <p class="mb-2">在扩展设置页面，您可以配置以下基本选项：</p>
        <ul class="list-disc pl-6 space-y-2 mb-4">
          <li>源语言和目标语言：设置默认翻译语言</li>
          <li>划词翻译：启用或禁用划词翻译功能</li>
          <li>触发方式：选择翻译的触发方式（立即或点击图标）</li>
          <li>快捷键：设置翻译快捷键</li>
        </ul>

        <h3 class="text-xl font-medium mt-6 mb-3">API配置</h3>
        <p class="mb-2">GLM Translator 支持多种API配置，您可以：</p>
        <ul class="list-disc pl-6 space-y-2 mb-4">
          <li>添加新API：支持多种预设服务或自定义API</li>
          <li>编辑API设置：包括API地址、密钥和模型名称</li>
          <li>复制或删除API配置</li>
        </ul>
        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <p class="text-blue-700 font-medium">
            注意：修改设置后，请点击"保存设置"按钮使更改生效。
          </p>
        </div>

        <h3 class="text-xl font-medium mt-6 mb-3">翻译方式</h3>
        <div class="space-y-4 mb-4">
          <div>
            <h4 class="text-lg font-medium mb-2">划词翻译</h4>
            <p>
              在网页上选中需要翻译的文本，根据您的设置，扩展会立即翻译或显示翻译图标供您点击。
            </p>
          </div>
          <div>
            <h4 class="text-lg font-medium mb-2">右键菜单翻译</h4>
            <p>选中文本后，右键点击并选择"使用GLM翻译"即可翻译选中文本。</p>
          </div>
          <div>
            <h4 class="text-lg font-medium mb-2">弹出窗口翻译</h4>
            <p>
              点击扩展图标打开弹出窗口，在输入框中输入需要翻译的文本并点击翻译按钮。
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-2xl font-semibold mb-4">常见问题</h2>
        <div class="space-y-5">
          <div>
            <h3 class="text-xl font-medium mb-2">翻译不工作？</h3>
            <p>
              请检查您的API配置是否正确，特别是API密钥是否有效。请确保您使用的服务账户有足够的额度或权限。
            </p>
          </div>
          <div>
            <h3 class="text-xl font-medium mb-2">如何更改翻译语言？</h3>
            <p>
              在扩展弹出窗口或设置页面中，您可以选择源语言和目标语言。您也可以在每次翻译前在弹出窗口中临时更改语言设置。
            </p>
          </div>
          <div>
            <h3 class="text-xl font-medium mb-2">如何添加新的API服务？</h3>
            <p>
              在API配置选项卡中点击"添加API"按钮，然后选择预设服务或输入自定义API信息。填写必要信息后点击保存即可。
            </p>
          </div>
          <div>
            <h3 class="text-xl font-medium mb-2">设置没有生效？</h3>
            <p>
              请确保修改设置后点击了"保存设置"按钮。某些设置可能需要刷新或重新启动浏览器才能生效。
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
export default {
  name: "Documentation",
};
</script>

<style scoped>
.documentation-container {
  line-height: 1.6;
}
</style>

import jsBeautify from 'js-beautify';
declare global {
  interface Window {
    Vue2ToCompositionApiVmBody: any
  }
}
// 移除vue2的选项
function removeOptions(str: string, start: string, end: string,) {
  if (str.includes(start)) {
    const startPos = str.indexOf(start)
    let startPrev = str.substring(0, startPos)
    let startNext = str.substring(startPos, str.length)
    if (startNext.includes(end)) {
      const endPos = startNext.indexOf(end)
      startNext = startNext.substring(endPos+end.length, str.length)
      return startPrev + startNext
    } else {
      return str;
    }
  } else {
    return str;
  }
}

// 移除注释
function removeDecomment (str: string) {
  str = str.replace(/("([^\\\"]*(\\.)?)*")|('([^\\\']*(\\.)?)*')|(\/{2,}.*?(\r|\n|$))|(\/\*(\n|.)*?\*\/)/g, function(word: string) { 
    return /^\/{2,}/.test(word) || /^\/\*/.test(word) ? "" : word; 
  });
  return str
}

// 字符在字符串出现的位置
function strWordPos (str: string, word: string) {
  let positions = new Array();
  let pos = str.indexOf(word);
  while(pos > -1){
      positions.push(pos);
      pos = str.indexOf(word,pos + 1);
  };
  return positions
}

// 替换两个指定字符之间的内容
function replaceSignBetween (str: any, startSign: string, endSign: string) {
  if (str.includes(startSign) && str.includes(endSign)) {
    let startSignPos:string[] = strWordPos(str,startSign)
    let endSignPos:string[] = strWordPos(str,endSign)
    let signBetween:object[] = []
    for (var i=0;i<endSignPos.length;i++) {
      let leftIndex: any = 0
      for (var j=0;j<startSignPos.length;j++) {
        if (startSignPos[j]<endSignPos[i]) {
          leftIndex = j
        }
      }
      signBetween.unshift(str.substring(startSignPos[leftIndex],endSignPos[i] + 1))
      delete startSignPos[leftIndex]
    }
    if (signBetween.length) {
      for(var k=0;k<signBetween.length;k++) {
        if (str.includes(signBetween[k])) {
          str = str.replace(signBetween[k],"''")
        }
      }
    }
  }
  return str;
}

// 去掉字符串前后空格
function Trim (str: any) {
  return str.replace(/(^\s*)|(\s*$)/g, "");
}

// 抽出  data() {return {XXX}}里面的XXX值,去空格去回车
function dataReturnStr (str: any) {
  // 去掉注释
  str = removeDecomment(str)
  // 去掉多余;
  str = str.replace("};","}")
  // 去空格回车分号，抽出data() {return {}}里面的内容
  str = str.replace(/\s*/g,"").match(/return{(\S*)}}/)[1];
  return str
}

// 抽出  data() {return {XXX}}里面的XXX值,带回车换行
function dataReturnObjStr (str: any, vmKeysData: any) {
  // 去掉注释
  str = removeDecomment(str)
  // 去掉多余;
  str = str.replace("};","}")
  if (vmKeysData && vmKeysData.length) {
    let startPos: string = str.indexOf(vmKeysData[0]+':')
    let endPosArr:string[] = strWordPos(str,'}')
    str = str.substring(startPos,endPosArr[endPosArr.length-2]);
    str = Trim(str);
  }
  return str
}

function Vue2ToCompositionApi(
  entryScriptContent: string = '',
): any {
  if (typeof entryScriptContent === 'string') {
    try {
      // output script content init
      let outputScriptContent: string = ''
      // 记录未定义变量/方法名数组
      let outputUndefinedName:string[] = []
      let outputUndefinedVar:object[] = []
      let outputUndefinedMethods:object[] = []
      // element-plus的全局$变量
      let elementPlusProperties :string[] = ['$message','$notify','$msgbox','$messageBox','$messageBox','$alert','$confirm','$prompt','$loading']
      // o-ui和项目中的全局$变量
      let ouiProperties :string[] = ['$O','$popbox','$tree','$smsTree','$smsMultiTree','$multiTree','$showEchart','$echarts','$views','$widgets','$components','$utils','$libs','$shortcuts','$openers','$openPlugin','$hasAuthority','$hasRole','$hasGroup','$hasSpecialGroup','$isRootSystem','$isServer','$computedDocStatus', '$hasPermission','$computedIsEdit','$getThemeFontSizeStyle']
      // 定义的全局$变量
      let customProperties: string[] = []
      // warning提示
      let warningMsg : string = ''
      let hasScriptTag = false

      // 去掉<script>和</script>
      if (entryScriptContent.includes('<script>') || entryScriptContent.includes('</script>')) {
        entryScriptContent = entryScriptContent.replace('<script>','').replace('</script>','')
        hasScriptTag = true
      }
      // 去掉components:
      entryScriptContent = removeOptions(entryScriptContent,'components:','},')
      // 去掉mixins:
      if (entryScriptContent.includes('mixins:')) {
        entryScriptContent = removeOptions(entryScriptContent,'mixins:','],')
        warningMsg = warningMsg + '存在混入'
      }

      // js-beautify init
      const jsBeautifyOptions: any = {
        indent_size: 4, // 缩进
        indent_char: ' ',
        indent_with_tabs: false, // 使用tab缩进
        editorconfig: false,
        eol: '\n', // 行结束符
        end_with_newline: false, // 使用换行结束输出
        indent_level: 0, //起始代码缩进数
        preserve_newlines: true, //保留空行
        max_preserve_newlines: 10, //最大连续保留换行符个数
        space_in_paren: false, //括弧添加空格 示例 f( a, b )
        space_in_empty_paren: false, //函数的括弧内没有参数时插入空格 示例 f( )
        jslint_happy: false,  //启用jslint-strict模式
        space_after_anon_function: false, //匿名函数的括号前添加一个空格
        space_after_named_function: false, // 命名函数的括号前添加一个空格
        brace_style: 'collapse-preserve-inline', //代码样式，可选值 [collapse|expand|end-expand|none][,preserve-inline] [collapse,preserve-inline]
        unindent_chained_methods: false, //不缩进链式方法调用
        break_chained_methods: false, //在随后的行中断开链式方法调用
        keep_array_indentation: false, //保持数组缩进
        unescape_strings: false,  //使用xNN符号编码解码可显示的字符
        wrap_line_length: 0,
        e4x: false, //支持jsx
        valueStrEnd_first: false,  //把逗号放在新行开头，而不是结尾
        operator_position: 'before-newline',
        indent_empty_lines: false,
        templating: ['auto'],
        html: {
            "indent_handlebars": true,
            "indent_inner_html": true,
            "indent-scripts": "normal", //[keep|separate|normal]
            "extra_liners": [] //配置标签列表，需要在这些标签前面额外加一空白行
        }
      }

      // vm body init
      window.Vue2ToCompositionApiVmBody = {}

      if (entryScriptContent.includes('export default')) {
        const exportPos = entryScriptContent.indexOf("export default")
        // import 相关代码
        let importContent: string = entryScriptContent.substring(0, exportPos)
        if (importContent) {
          // 去掉vue2的import
          if (importContent.includes("import Vue from 'vue';")) {
            importContent = importContent.replace("import Vue from 'vue';","")
          }
          if (importContent.includes("import Vue from 'vue'")) {
            importContent = importContent.replace("import Vue from 'vue'","")
          }
          if (importContent.includes('path')) {
            importContent = importContent.replace("'path'","'path-browserify'")
          }
          // 添加jquery
          if (entryScriptContent.includes('$.fn') || entryScriptContent.includes('$(')) {
            importContent = importContent  + '\n' + "import jQuery from 'jquery'" + '\n'
          }
        }
        // 截取出不包含import相关代码
        entryScriptContent = entryScriptContent.substring(exportPos, entryScriptContent.length)
        
        let scriptContent: string = jsBeautify(entryScriptContent, jsBeautifyOptions);
        eval(scriptContent.replace('export default', 'window.Vue2ToCompositionApiVmBody ='))
        const vmBody: any = window.Vue2ToCompositionApiVmBody
        let dataVmKeys:string[] = []
        if (vmBody.data && typeof vmBody.data === 'function') {
          //  提取data() {return {XXX}}里面的XXX值
          let dataOptionsStr: any = dataReturnStr(vmBody.data.toString())
          // 去掉对象数组{},[],()里面内容
          dataOptionsStr = replaceSignBetween(dataOptionsStr,"{","}");
          dataOptionsStr = replaceSignBetween(dataOptionsStr,"[","]");
          dataOptionsStr = replaceSignBetween(dataOptionsStr,"(",")");
          // 按,分隔出属性+属性值字符串
          let dataOptionsArr:string[] = dataOptionsStr.split(',')
          if (dataOptionsArr.length) {
            for (var i=0;i<dataOptionsArr.length;i++) {
              if (dataOptionsArr[i]) {
                let key = dataOptionsArr[i].split(':')[0]
                dataVmKeys.push(key)
              }
            };
          };
        };
        // vm content init
        const vmContent: any = {
          name: vmBody.name && typeof vmBody.name === 'string' ? vmBody.name : {},
          props: vmBody.props && typeof vmBody.props === 'object' ? vmBody.props : {},
          data: vmBody.data && typeof vmBody.data === 'function' ? vmBody.data : () => ({}),
          computed: vmBody.computed && typeof vmBody.computed === 'object' ? vmBody.computed : {},
          watch: vmBody.watch && typeof vmBody.watch === 'object' ? vmBody.watch : {},
          methods: vmBody.methods && typeof vmBody.methods === 'object' ? vmBody.methods : {},
          filters: vmBody.filters && typeof vmBody.filters === 'object' ? vmBody.filters : {},
          hooks: {},
          emits: [],
          refs: [],
          use: {},
          import: { vue: [], 'vue-router': [], vuex: [] }
        }

        // vm hooks content init
        for (const prop in vmBody) {
          if ([
            'beforeCreate', 'created', 'beforeMount', 'mounted',
            'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed',
            'activated', 'deactivated', 'errorCaptured'].includes(prop) &&
            typeof vmBody[prop] === 'function'
          ) {
            vmContent.hooks[prop] = vmBody[prop]
          }
        }

        // vm keys init
        const vmKeys: any = {
          name: Object.keys(vmContent.name),
          props: Array.isArray(vmContent.props)?vmContent.props:Object.keys(vmContent.props),
          data: dataVmKeys,
          computed: Object.keys(vmContent.computed),
          watch: Object.keys(vmContent.watch),
          methods: Object.keys(vmContent.methods),
          filters: Object.keys(vmContent.filters),
          hooks: Object.keys(vmContent.hooks),
          use: () => Object.keys(vmContent.use),
          import: () => Object.keys(vmContent.import)
        }

        // vm output init
        const vmOutput: any = {
          import: '',
          name: '',
          use: '',
          props: '',
          emits: '',
          refs: '',
          data: '',
          computed: '',
          watch: '',
          hooks: '',
          methods: '',
          filters: ''
        }
        // vm set content methods init
        const vmSetContentMethods: any = {
          name(): void {
            if (vmKeys.name && vmContent.name !== null && typeof vmContent.name === 'string') {
              vmOutput.name = '// name' + '\n'
              vmOutput.name = vmOutput.name + `defineOptions({
                name: '${vmContent.name}',
              })`
            }
          },
          porps(): void {
            if (vmKeys.props.length > 0 && vmContent.props !== null && typeof vmContent.props === 'object') {
              const propsContentStr: string = utilMethods.getContentStr(vmContent.props, {
                arrowFunction: true
              })
              if (propsContentStr) {
                vmOutput.props = '// props' + '\n'
                vmOutput.props = vmOutput.props + `const props = defineProps(${propsContentStr})`
              }
            }
          },
          data(): void {
            if (vmKeys.data.length > 0) {
              let dataFunctionStr: any = utilMethods.getContentStr(vmContent.data, {
                replaceDataKeyToUseData: true
              })
              if (dataFunctionStr) {
                // 抽出  data() {return {XXX}}里面的XXX值
                // const dataContentStr: string = dataReturnStr(dataFunctionStr.toString())
                let dataContentStr: string = dataReturnObjStr(dataFunctionStr.toString(),vmKeys.data)
                if (vmKeys.data.length) {
                  // refs
                  vmOutput.data = '// refs' + '\n'
                  for(var i=0;i<vmKeys.data.length;i++) {
                    // 截取当前key到下个key前面的字符串，作为当前key的值
                    const key = vmKeys.data[i];
                    let nextKey = '';
                    if (i+1 < vmKeys.data.length) {
                      nextKey =  vmKeys.data[i + 1]
                    };
                    let keyValueStr = ''
                    let start = dataContentStr.indexOf(`${key}:`) + key.length+ 1
                    let end;
                    // 目前程序，当存在包含关系属性会截取错误，或者一个属性里面值对象包含了另外一个属性
                    if (nextKey) {
                      end = dataContentStr.indexOf(`${nextKey}:`)
                    } else {
                      end = dataContentStr.length
                    }
                    keyValueStr = dataContentStr.substring(start,end)
                    // 去掉头尾空格
                    keyValueStr = Trim(keyValueStr)
                    // 如果尾部有,号去掉
                    keyValueStr = keyValueStr.replace(/,$/gi,"")
                    vmOutput.data += `let ${key} = ref(${keyValueStr})`+ '\n'
                  }
                };
              }
            }
          },
          computed(): void {
            if (
              vmKeys.computed.length > 0 &&
              vmContent.computed !== null &&
              typeof vmContent.computed === 'object'
            ) {
              const computedValues: string[] = []
              for (const prop in vmContent.computed) {
                const computedContent: any = vmContent.computed[prop]
                if (
                  computedContent !== null &&
                  (typeof computedContent === 'object' || typeof computedContent === 'function')
                ) {
                  const computedName: string = typeof computedContent === 'function' ? computedContent.name : prop
                  const computedFunctionStr: string = utilMethods.getContentStr(computedContent, {
                    arrowFunction: true
                  })
                  if (computedName && computedFunctionStr) {
                    computedValues.push(`const ${computedName} = computed(${computedFunctionStr})`)
                  }
                }
              }
              if (computedValues.length > 0) {
                vmOutput.computed = '// computed' + '\n'
                vmOutput.computed = vmOutput.computed + computedValues.join('\n\n')
                utilMethods.addImport('vue', 'computed')
              }
            }
          },
          watch(): void {
            if (
              vmKeys.watch.length > 0 &&
              vmContent.watch !== null &&
              typeof vmContent.watch === 'object'
            ) {
              const watchValues: string[] = []
              for (const prop in vmContent.watch) {
                const watchContent: any = vmContent.watch[prop]
                if (typeof watchContent === 'function') {
                  const watchName: string = utilMethods.replaceKey(watchContent.name)
                  const watchFunctionStr: string = utilMethods.getContentStr(watchContent, {
                    arrowFunction: true
                  })
                  if (watchName && watchFunctionStr) {
                    watchValues.push(`watch(() => ${watchName}, ${watchFunctionStr})`)
                  }
                } else if (
                  watchContent !== null &&
                  typeof watchContent === 'object' &&
                  typeof watchContent.handler === 'function'
                ) {
                  const watchName: string = utilMethods.replaceKey(prop)
                  const watchFunctionStr: string = utilMethods.getContentStr(watchContent.handler, {
                    arrowFunction: true
                  })
                  const watchOptionsStr: string = utilMethods.getContentStr(watchContent, {
                    excludeProps: ['handler']
                  })
                  if (watchName && watchFunctionStr && watchOptionsStr) {
                    watchValues.push(
                      watchOptionsStr !== '{}'
                        ? `watch(() => ${watchName}, ${watchFunctionStr}, ${watchOptionsStr})`
                        : `watch(() => ${watchName}, ${watchFunctionStr})`
                    )
                  }
                }
              }
              if (watchValues.length > 0) {
                vmOutput.watch = '// watch' + '\n'
                vmOutput.watch = vmOutput.watch + watchValues.join('\n\n')
                utilMethods.addImport('vue', 'watch')
              }
            }
          },
          hooks(): void {
            if (
              vmKeys.hooks.length > 0 &&
              vmContent.hooks !== null &&
              typeof vmContent.hooks === 'object'
            ) {
              const hookValues: string[] = []
              for (const prop in vmContent.hooks) {
                const hookContent: any = vmContent.hooks[prop]
                if (typeof hookContent === 'function') {
                  if ([
                    'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed',
                    'activated', 'deactivated', 'errorCaptured'].includes(hookContent.name)
                  ) {
                    const v3HooksNameDist: any = {
                      beforeMount: 'onBeforeMount',
                      mounted: 'onMounted',
                      beforeUpdate: 'onBeforeUpdate',
                      updated: 'onUpdated',
                      beforeDestroy: 'onBeforeUnmount',
                      destroyed: 'onUnmounted',
                      activated: 'onActivated',
                      deactivated: 'onDeactivated',
                      errorCaptured: 'onErrorCaptured'
                    }
                    const hookName: string = v3HooksNameDist[hookContent.name as string]
                    const hookFunctionStr: string = utilMethods.getContentStr(hookContent, {
                      arrowFunction: true
                    })
                    if (hookName && hookFunctionStr) {
                      hookValues.push(
                        hookContent.constructor.name === 'AsyncFunction'
                          ? `${hookName} (async ${hookFunctionStr})`
                          : `${hookName} (${hookFunctionStr})`
                      )
                      utilMethods.addImport('vue', hookName)
                    }
                  }
                }
              }
              if (hookValues.length > 0) {
                vmOutput.hooks = '// lifecycle' + '\n'
                vmOutput.hooks = vmOutput.hooks + hookValues.join('\n\n')
              }
            }
          },
          methods(): void {
            if (
              vmKeys.methods.length > 0 &&
              vmContent.methods !== null &&
              typeof vmContent.methods === 'object'
            ) {
              const methodValues: string[] = []
              for (const prop in vmContent.methods) {
                const methodContent: any = vmContent.methods[prop]
                if (typeof methodContent === 'function') {
                  const methodName: string = methodContent.name
                  const methodFunctionStr: string = utilMethods.getContentStr(methodContent)
                  if (methodName && methodFunctionStr) {
                    methodValues.push(methodContent.constructor.name === 'AsyncFunction'? `async function ${methodName} ${methodFunctionStr}`: `function ${methodName} ${methodFunctionStr}`)
                  }
                }
              }
              if (methodValues.length > 0) {
                vmOutput.methods = '// methods' + '\n'
                vmOutput.methods = vmOutput.methods + methodValues.join('\n\n')
              }

            }
            // created
            if (
              vmKeys.hooks.length > 0 &&
              vmContent.hooks !== null &&
              typeof vmContent.hooks === 'object'
            ) {
              const hookValues: string[] = []
              for (const prop in vmContent.hooks) {
                const hookContent: any = vmContent.hooks[prop]
                if (typeof hookContent === 'function') {
                  if (['beforeCreate','created'].includes(hookContent.name)) {
                    const hookName: string = `on${hookContent.name.substring(0, 1).toUpperCase()}${hookContent.name.substring(1)}`
                    const hookFunctionStr: string = utilMethods.getContentStr(hookContent)
                    if (hookName && hookFunctionStr) {
                      hookValues.push(
                        hookContent.constructor.name === 'AsyncFunction'
                          ? `async function ${hookName} ${hookFunctionStr}\n${hookName}()`
                          : `function ${hookName} ${hookFunctionStr}\n${hookName}()`
                      )
                    }
                  }
                }
              }
              if (hookValues.length > 0) {
                vmOutput.methods = vmOutput.methods + '\n\n' + '// created' + '\n'
                vmOutput.methods = vmOutput.methods + hookValues.join('\n\n')
              }
            }
          },
          filters(): void {
            if (
              vmKeys.filters.length > 0 &&
              vmContent.filters !== null &&
              typeof vmContent.filters === 'object'
            ) {
              const filterValues: string[] = []
              for (const prop in vmContent.filters) {
                const filterContent: any = vmContent.filters[prop]
                if (typeof filterContent === 'function') {
                  const filterName: string = filterContent.name
                  const filterFunctionStr: string = utilMethods.getContentStr(filterContent)
                  if (filterName && filterFunctionStr) {
                    filterValues.push(`function ${filterName} ${filterFunctionStr}`)
                  }
                }
              }
              if (filterValues.length > 0) {
                vmOutput.filters = filterValues.join('\n\n')
              }
            }
          },
          emits(): void {
            if (
              vmContent.emits instanceof Array &&
              vmContent.emits.length > 0
            ) {
              const emitValues: string[] = []
              for (const emits of vmContent.emits) {
                const emitContent: string = emits.split('update:').pop()
                if (emitContent) {
                  emitValues.push(`\'${emitContent}\'`)
                }
              }
              if (emitValues.length > 0) {
                vmOutput.emits = '// emit' + '\n'
                vmOutput.emits = vmOutput.emits + `const emit = defineEmits([${emitValues.join(', ')}])`
              }
            }
          },
          refs(): void {
            if (
              vmContent.refs instanceof Array &&
              vmContent.refs.length > 0
            ) {
              const refValues: string[] = []
              for (const ref of vmContent.refs) {
                if (ref) {
                  refValues.push(`const ${ref} = ref()`)
                }
              }
              if (refValues.length > 0) {
                vmOutput.refs = '// refs HTMLDivElement' + '\n'
                vmOutput.refs = vmOutput.refs + refValues.join('\n')
                utilMethods.addImport('vue', 'ref')
              }
            }
          },
          use(): void {
            if (
              vmKeys.use().length > 0 &&
              vmContent.use !== null &&
              typeof vmContent.use === 'object'
            ) {
              const useValues: string[] = []
              for (const prop in vmContent.use) {
                const useContent: string = vmContent.use[prop]
                if (useContent) {
                  useValues.push(useContent)
                }
              }
              if (useValues.length > 0) {
                vmOutput.use = useValues.sort().join('\n')
              }
            }
          },
          import(): void {
            // 注释掉所有的import
            // if (
            //   vmKeys.import().length > 0 &&
            //   vmContent.import !== null &&
            //   typeof vmContent.import === 'object'
            // ) {
            //   const importValues: string[] = []
            //   for (const prop in vmContent.import) {
            //     const importContent: string[] = vmContent.import[prop]
            //     if (importContent.length > 0) {
            //       importValues.push(`import { ${importContent.sort().join(', ')} } from \'${prop}\'`)
            //     }
            //   }
            //   if (importValues.length > 0) {
            //     vmOutput.import = importValues.join('\n')
            //   }
            // }
          },
          output(): void {
            const outputValues: string[] = []
            for (const prop in vmOutput) {
              const outputContent: string = vmOutput[prop]
              if (outputContent) {
                outputValues.push(outputContent)
              }
            }
            if (outputValues.length > 0) {
              outputScriptContent = outputValues.join('\n\n')
            }
          }
        }

        // util methods init
        const utilMethods: any = {
          getIndexArr(
            {
              values = [],
              content = '',
              start = 0,
              append = false
            }: {
              values: string[],
              content: string,
              start: number,
              append: boolean
            }
          ): number[] {
            const result: number[] = []
            if (
              values instanceof Array &&
              typeof content === 'string' &&
              typeof start === 'number' &&
              typeof append === 'boolean'
            ) {
              for (const value of values) {
                const valueIndex: number = content.indexOf(value, start)
                if (valueIndex !== -1) {
                  result.push(append ? valueIndex + (+value.length) : valueIndex)
                }
              }
            }
            return result
          },
          getContentStr(
            value: any,
            options: {
              arrowFunction?: boolean,
              excludeProps?: string[],
              replaceDataKeyToUseData?: boolean
            } = {
              arrowFunction: false,
              excludeProps: [],
              replaceDataKeyToUseData: false
            }
          ): string {
            let result: string = ''
            if (typeof options === 'object' && Object.keys(options).length > 0) {
              if (typeof value === 'string') {
                result = `\'${value}\'`
              } else if (typeof value === 'function') {
                let content: string = value.toString()
                if (content.includes('[native code]')) {
                  result = `${value.name}`
                } else {
                  content = utilMethods.replaceKey(content, {
                    separator: 'this.',
                    dataKeyToUseData: options.replaceDataKeyToUseData
                  })
                  // 修复部分this,this)没替换到
                  content = content.replaceAll('this,', 'proxy,')
                  content = content.replaceAll('this)', 'proxy)')
                  // 修复Vue.prototype.
                  content = content.replaceAll('Vue.prototype.', 'proxy,')
                  // 修复jquery的
                  content = content.replaceAll('$.fn', 'jQuery.fn').replaceAll('$(', 'jQuery(')
                  
                  const arg: string = content.substring(
                    content.indexOf('(') + 1,
                    Math.min(
                      ...utilMethods.getIndexArr({
                        values: [') {', ') =>'],
                        content,
                        start: 0,
                        append: false
                      })
                    )
                  )
                  const body: string = content.substring(
                    Math.min(
                      ...utilMethods.getIndexArr({
                        values: [') {', ') => '],
                        content,
                        start: 0,
                        append: true
                      })
                    ) - 1,
                    content.length
                  )
                  result = options.arrowFunction ? `(${arg}) => ${body}` : `(${arg}) ${body}`
                }
              } else if (value instanceof Array) {
                const values: string[] = []
                for (const item of value) {
                  const content: string = utilMethods.getContentStr(item, options)
                  values.push(content)
                }
                result = values.length > 0 ? `[${values.join(', ')}]` : '[]'
              } else if (typeof value === 'object' && value !== null) {
                const values: string[] = []
                for (const prop in value) {
                  if (!options.excludeProps?.includes(prop)) {
                    const content: string = utilMethods.getContentStr(value[prop], options)
                    values.push(`${prop}: ${content}`)
                  }
                }
                result = values.length > 0 ? `{\n${values.join(',\n')}\n}` : '{}'
              } else {
                result = `${value}`
              }
            }
            return result
          },
          // 替换this等值
          replaceKey(
            value: string,
            options: {
              separator?: string | undefined,
              dataKeyToUseData?: boolean
            } = {
              separator: undefined,
              dataKeyToUseData: false
            }
          ): string {
            let result: string = ''
            if (typeof value === 'string' && typeof options === 'object' && Object.keys(options).length > 0) {
              let contents: string[] = options.separator ? value.split(options.separator) : [value]
              const contentsBeginIndex: number = options.separator ? 1 : 0
              if (contents.length > contentsBeginIndex) {
                for (let i = contentsBeginIndex; i < contents.length; i++) {
                  let content: string = contents[i]
                  const terminator: string[] = [
                    '\n', '\t', '\'', '\"', '\`', '\ ',
                    '.', ',', ';', '?', '!', '[', ']', '{', '}', ')', '(',
                    '=', '+', '-', '*', '/', '%', '>', '<', '^', '~', '&', '|'
                  ]
                  const key: string = content.substring(0, Math.min(
                    ...utilMethods.getIndexArr({
                      values: terminator,
                      content,
                      start: 0,
                      append: false
                    })
                  ))
                  // 重置this.$相关
                  const resetCurrentInstance: any = (message: string): void => {
                    if (!outputUndefinedName.includes(key)) {
                      outputUndefinedName.push(key)
                      if (entryScriptContent.includes(`this.${key}(`) || entryScriptContent.includes(`this.${key} (`)) {
                        if (key != '$set') {
                          outputUndefinedMethods.push({old: key, new: key, prefix: ''})
                        }
                      } else {
                        outputUndefinedVar.push({old: key, new: key, suffix: '.value'})
                      }
                    }
                    contents[i] = content.replace(key, `${key}`)
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  }
                  if (vmKeys.props.includes(key)) {
                    contents[i] = content.replace(key, `props.${key}`)
                  } else if (vmKeys.data.includes(key) && options.dataKeyToUseData) {
                    contents[i] = content.replace(key, `useData().${key}`)
                    utilMethods.addUse('data')
                  } else if (vmKeys.data.includes(key)) {
                    contents[i] = content.replace(key, `${key}.value`)
                  } else if (vmKeys.computed.includes(key)) {
                    contents[i] = content.replace(key, `${key}.value`)
                  } else if (vmKeys.methods.includes(key)) {
                    contents[i] = content
                  } else if (['$data', '$el', '$options', '$parent', '$root', '$children', '$isServer','$listeners', '$watch', '$on', '$once', '$off', '$mount', '$forceUpdate', '$destroy'].includes(key)) {
                    contents[i] = content.replace(key, `proxy.${key}`)
                    if (key == '$options' || key == '$parent' || key == '$children') {
                      warningMsg = warningMsg + '存在' + key + '已废除,请处理'
                    }
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  } else if (['$attrs', '$slots', '$router', '$route', '$nextTick'].includes(key)) {
                    contents[i] = content.replace('$', '')
                    if (key === '$attrs') {
                      utilMethods.addImport('vue', 'useAttrs')
                      utilMethods.addUse('attrs')
                    } else if (key === '$slots') {
                      utilMethods.addImport('vue', 'useSlots')
                      utilMethods.addUse('slots')
                    } else if (key === '$router') {
                      utilMethods.addImport('vue-router', 'useRouter')
                      utilMethods.addUse('router')
                    } else if (key === '$route') {
                      utilMethods.addImport('vue-router', 'useRoute')
                      utilMethods.addUse('route')
                    } else if (key === '$nextTick') {
                      utilMethods.addImport('vue', 'nextTick')
                    }
                  } else if  (key === '$props') {
                    contents[i] = content.replace('$', '')
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  } else if (key === '$emit') {
                    const beginIndex: number = Math.min(
                      ...utilMethods.getIndexArr({
                        values: ['$emit(\'', '$emit(\"', '$emit(\`', '$emit([\'', '$emit([\"', '$emit([\`'],
                        content,
                        start: 0,
                        append: true
                      })
                    )
                    const endIndex: number = Math.min(
                      ...utilMethods.getIndexArr({
                        values: ['\'', '\"', '\`'],
                        content,
                        start: beginIndex,
                        append: false
                      })
                    )
                    const emitName: string = content.substring(beginIndex, endIndex)
                    if (emitName) {
                      if (!vmContent.emits.includes(emitName)) {
                        vmContent.emits.push(emitName)
                      }
                      contents[i] = content.replace('$', '')
                    } else {
                      contents[i] = content.replace('$', '')
                    }
                  } else if (key === '$refs') {
                    const beginIndex: number = Math.min(
                      ...utilMethods.getIndexArr({
                        values: ['$refs.', '$refs?.'],
                        content,
                        start: 0,
                        append: true
                      })
                    )
                    const endIndex: number = Math.min(
                      ...utilMethods.getIndexArr({
                        values: terminator,
                        content,
                        start: beginIndex,
                        append: false
                      })
                    )
                    const refsName: string = content.substring(beginIndex, endIndex)
                    if (refsName) {
                      if (!vmContent.refs.includes(refsName)) {
                        vmContent.refs.push(refsName)
                      }
                      contents[i] = `${refsName}.value${content.substring(content.indexOf(refsName) + refsName.length, content.length)}`
                    } else {
                      resetCurrentInstance('Cannot find refs name')
                    }
                  } else if (elementPlusProperties.includes(key)) {
                    contents[i] = content.replace(key, `proxy.${key}`)
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  } else if (ouiProperties.includes(key)) {
                    contents[i] = content.replace(key, `proxy.${key}`)
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  } else if (customProperties.includes(key)) {
                    contents[i] = content.replace(key, `proxy.${key}`)
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  } else if (key === '$store') { // vuex 处理
                    contents[i] = content.replace(`${key}.state.user`, `proxy.${key}.useUserState()`)
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  } else if (key === 'bus') { // bus 处理
                    if (content.includes(`${key}.$emit`)) {
                      contents[i] = content.replace(`${key}.$emit`,`proxy.${key}.emit`)
                    }
                    if (content.includes(`${key}.$on`)) {
                      contents[i] = content.replace(`${key}.$on`,`proxy.${key}.on`)
                    }
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  } else if (key == 'userName' || key == 'userNo') { // userName处理
                    contents[i] = content.replace(key, `proxy.$store.useUserState().${key}`)
                    utilMethods.addImport('vue', 'getCurrentInstance')
                    utilMethods.addUse('vm')
                  } else if (key) {
                    resetCurrentInstance(`Unknown source: ${key}`)
                  } else {
                    contents[i] = options.separator ? content.replace(key, `${options.separator}${key}`) : `${content}`
                  }
                }
              }
              result = contents.join('')
            }
            return result
          },
          addImport(type: string, value: string): void {
            if (
              typeof type === 'string' &&
              typeof value === 'string' &&
              ['vue', 'vue-router', 'vuex'].includes(type)
            ) {
              const importContent: string[] = vmContent.import[type]
              if (!importContent?.includes(value)) {
                importContent.push(value)
              }
            }
          },
          addUse(type: string): void {
            if (
              typeof type === 'string' &&
              ['data', 'vm', 'attrs', 'slots', 'router', 'route', 'store'].includes(type)
            ) {
              const contentDist: any = {
                vm: 'const { proxy } = getCurrentInstance()',
                data: 'const useData = () => data',
                attrs: 'const attrs = useAttrs()',
                slots: 'const slots = useSlots()',
                router: 'const router = useRouter()',
                route: 'const route = useRoute()',
                // store: 'const store = useStore()'
              }
              const useContent: string = contentDist[type]
              if (useContent) {
                vmContent.use[type] = useContent
              }
            }
          }
        }

        // vm set content methods runing
        for (const prop in vmSetContentMethods) {
          if (typeof vmSetContentMethods[prop] === 'function') {
            vmSetContentMethods[prop]()
          }
        }

        // $set处理
        if (outputScriptContent.includes('$set')) {
          let setParams = outputScriptContent.match(/(?<=\$set\()(.+?)(?=\))/g)
          if (setParams && setParams.length) {
            setParams.forEach(params=>{
              let objectSet = ''
              if (params.includes(',')) {
                params.split(',').forEach((item,index)=>{
                  if (index == 0) {
                    objectSet = objectSet + item;
                  } else if (index == 1) {
                    objectSet = objectSet + '['+item+'] = '
                  } else if (index == 2) {
                    objectSet = objectSet + item
                  }
                })
              }
              let vueSet = '$set('+ params + ')'
              outputScriptContent = outputScriptContent.replace(vueSet, objectSet)
            })
          }
        }

        // $delete处理
        if (outputScriptContent.includes('$delete')) {
          let setParams = outputScriptContent.match(/(?<=\$delete\()(.+?)(?=\))/g)
          if (setParams && setParams.length) {
            setParams.forEach(params=>{
              let objectDelete = 'delete '
              if (params.includes(',')) {
                params.split(',').forEach((item,index)=>{
                  if (index == 0) {
                    objectDelete = objectDelete + item;
                  } else if (index == 1) {
                    objectDelete = objectDelete + '['+item+']'
                  }
                })
              }
              let vueDelete = '$delete('+ params + ')'
              outputScriptContent = outputScriptContent.replace(vueDelete, objectDelete)
            })
          }
        }

        // 拼接
        outputScriptContent = importContent + outputScriptContent

        // output script content beautify
        outputScriptContent = jsBeautify(outputScriptContent, jsBeautifyOptions)

        if (hasScriptTag) {
          outputScriptContent = "<script setup>" + '\n' + outputScriptContent + '\n' + "</script>"
        } else {
          outputScriptContent = outputScriptContent
        }
        // done
        return {
          outputScriptContent: outputScriptContent,
          outputUndefinedVar: outputUndefinedVar,
          outputUndefinedMethods: outputUndefinedMethods,
          warning: warningMsg
        }
      } else {
        return entryScriptContent
      }
    } catch (err: any) {
      throw new Error(err)
    }
  }
}

export default Vue2ToCompositionApi

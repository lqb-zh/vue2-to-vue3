<template>
  <el-form style="width: calc(100% - 40px);height: calc(100vh - 40px);margin: 20px;"
    ref="formRef"
    :model="form"
  >
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item>
          <div class="editor-wrapper">
              <Codemirror
              v-model:value="form.oldCode"
              :options="cmOptions"
              border
              placeholder="选项式API"/>
          </div>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <div class="editor-wrapper">
          <Codemirror
            v-model:value="form.code"
            :options="cmOptions"
            border
            placeholder="组合式API"/>
        </div>
      </el-col>
    </el-row>
    <el-form-item>
      <el-button v-if="undefinedVar && undefinedVar.length"
        type="primary"
        @click="drawer=true">
        修复未定义变量/方法
      </el-button>
      <el-button type="primary" @click="submitForm">
        转换并复制
      </el-button>
      <el-button type="primary" @click="empty">
        清空
      </el-button>
    </el-form-item>
  </el-form>
  <el-drawer v-model="drawer"
    :with-header="false"
    size="100%"
    :direction="direction">
    <template #default>
      <el-row :gutter="10">
        <el-col v-if="undefinedVar.length"
          :span="undefinedVar.length&&undefinedMethods.length?12:24">
          <h4>未定义变量：</h4>
          <el-table :data="undefinedVar"
            border>
            <el-table-column>
              <template #header>
                  添加后缀 
                  <el-select size="small"
                      v-model="undefinedVarSuffix"
                      clearable
                      filterable
                      allow-create
                      default-first-option
                      :reserve-keyword="false"
                      @change="handleChangeSuffix">
                      <el-option
                        v-for="item in undefinedVarSuffixOptions"
                        :key="item"
                        :label="item"
                        :value="item"
                      />
                  </el-select>
              </template>
              <template #default="scope">
                {{scope.row.new}}
                <!-- <el-input v-model="scope.row.new" clearable></el-input> -->
                <!-- <el-select size="small"
                      v-model="scope.row.suffix"
                      clearable
                      filterable
                      allow-create
                      default-first-option
                      :reserve-keyword="false"
                      @change="handleChangeSuffix">
                      <el-option
                        v-for="item in undefinedVarSuffixOptions"
                        :key="item"
                        :label="item"
                        :value="item"
                      />
                  </el-select> -->
                <!-- <el-input v-model="scope.row.suffix" clearable>
                  <template #append>
                    <el-button size="small" @click="handleAddSuffix(scope.$index, scope.row)">添加</el-button>
                  </template>
                </el-input> -->
              </template>
            </el-table-column>
          </el-table>
        </el-col>
        <el-col v-if="undefinedMethods.length"
          :span="undefinedVar.length&&undefinedMethods.length?12:24">
          <h4>未定义方法：</h4>
          <el-table :data="undefinedMethods"
            border>
            <el-table-column>
              <template #header>
                添加前缀 
                <el-select size="small"
                    v-model="undefinedMethodsPrefix"
                    clearable
                    filterable
                    allow-create
                    default-first-option
                    :reserve-keyword="false"
                    @change="handleChangePrefix">
                    <el-option
                      v-for="item in undefinedMethodsPrefixOptions"
                      :key="item"
                      :label="item"
                      :value="item"
                    />
                </el-select>
              </template>
              <template #default="scope">
                {{scope.row.new}}
                <!-- <el-input v-model="scope.row.prefix" clearable>
                  <template #append>
                    <el-button size="small" @click="handleAddPrefix(scope.$index, scope.row)">添加</el-button>
                  </template>
                </el-input> -->
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </template>
    <template #footer>
      <div style="flex: auto">
        <el-button @click="cancelClick">暂不处理</el-button>
        <el-button type="primary" @click="confirmClick">确定处理</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup>
import clipboard3 from "vue-clipboard3"
import Vue2ToCompositionApi from './toComposition.ts'
import { CirclePlus, Remove,CircleClose } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElNotification  } from 'element-plus'
import { ref,computed } from 'vue'
import 'codemirror/lib/codemirror.js';
import 'codemirror/addon/fold/foldcode.js'; // 代码折叠
import 'codemirror/addon/fold/foldgutter.js'; // 代码折叠
import 'codemirror/addon/fold/brace-fold.js'; // 代码折叠
import 'codemirror/addon/fold/comment-fold.js'; // 代码折叠
import 'codemirror/addon/selection/active-line.js'; // 当前行高亮
import 'codemirror/addon/edit/closetag.js'; // 自动闭合标签
import 'codemirror/addon/edit/closebrackets.js'; //自动闭合标签
// 语言包（codemirror/mode目录下有目前支持的语言包，有额外需要可以自行导入）
import 'codemirror/mode/javascript/javascript.js';
import 'codemirror/mode/groovy/groovy.js';
// 搜索
import 'codemirror/addon/scroll/annotatescrollbar.js'
import 'codemirror/addon/search/matchesonscrollbar.js'
import 'codemirror/addon/search/match-highlighter.js'
import 'codemirror/addon/search/jump-to-line.js'
import 'codemirror/addon/dialog/dialog.js'
import 'codemirror/addon/dialog/dialog.css'
import 'codemirror/addon/search/searchcursor.js'
import 'codemirror/addon/search/search.js'
// css
import 'codemirror/addon/fold/foldgutter.css'; // 代码折叠
import 'codemirror/lib/codemirror.css'; // 编辑器样式
import 'codemirror/theme/darcula.css'; // 主题: darcula

defineOptions({
name: "HelloWorld"  
})

// refs HTMLDivElement
const formRef =  ref(null);

// refs
let form = ref({
oldCode: '',
code: ''
});
const cmOptions= ref({
  mode: "text/groovy", //实现groovy代码高亮
  mode: "text/javascript", // Language mode
  theme: "darcula", // Theme
  foldGutter: true, //代码块折叠
  gutters: [ //代码块折叠
      'CodeMirror-linenumbers',
      'CodeMirror-foldgutter'
  ],
  autoCloseTags: true, //自动闭合标签
  autoCloseBrackets: true, //自动闭合标签
  lineNumbers: true, // 显示行号
  lineWrapping: false, // 自动换行
  styleActiveLine: true, // 选中行高亮
})
const drawer = ref(false)
const direction = ref('ltr')
let undefinedVar = ref([])
let undefinedVarSuffix = ref('')
let undefinedVarSuffixOptions = ref(['.value'])
let undefinedMethods = ref([])
let undefinedMethodsPrefix = ref('')
let undefinedMethodsPrefixOptions = ref(['proxy.','proxy.$'])


// methods
const submitForm = () => {
  try {
    const {outputScriptContent,outputUndefinedVar,outputUndefinedMethods,warning} = Vue2ToCompositionApi(form.value.oldCode)
    form.value.code = outputScriptContent
    undefinedVar.value = outputUndefinedVar
    undefinedMethods.value = outputUndefinedMethods
    if (undefinedVar.value && undefinedVar.value.length) {
      drawer.value = true
    }
    if (warning) {
      ElNotification({
        title: 'Warning',
        message: warning,
        type: 'warning',
      })
    }
    if (form.value.code) {
      const { toClipboard } = clipboard3()
      toClipboard(form.value.code)
    }
  } catch (err) {
    console.log(err.message)
    if (err.message) {
      let errorArr = err.message.split("Error:")
      const errName = {
        Eval: "eval()的使用与定义不一致",
        Range: "数值越界",
        Reference: "非法或者不能识别的引用数值",
        Syntax: "发生语法解析错误",
        Type: "操作数类型错误",
        URI: "URL处理函数使用不当"
      };
      let errMsg = errName[errorArr[0]] +"："+ errorArr[1]
      console.log(errMsg)
      ElMessage(errMsg)
    }
  }
}

const empty = () => {
form.value = {
  oldCode: '',
  code: ''
}
undefinedVar.value = []
}

function addPrefixSuffix (obj,pos,index,value) {
if (pos == 'prefix') {
  if (index == 'all') {
    obj.forEach(item=>{
      if (item.new.includes(item.prefix)) {
        item.new =  item.new.replaceAll(item.prefix,'')
      } else {
        item.new = item.prefix + item.new
      }
    })
  } else {
    if (obj[index].new.includes(value)) {
      obj[index].new =  obj[index].new.replaceAll(value,'')
    } else {
      obj[index].new = value + obj[index].new
    }
  }
} else if (pos == 'suffix') {
  if (index == 'all') {
    obj.forEach(item=>{
      if (item.new.includes(item.suffix)) {
        item.new =  item.new.replaceAll(item.suffix,'')
      } else {
        item.new = item.new + item.suffix
      }
    })
  } else {
    if (obj[index].new.includes(value)) {
      obj[index].new =  obj[index].new.replaceAll(value,'')
    } else {
      obj[index].new = obj[index].new + value
    }
  }
}
}

function resetPrefixSuffix (obj) {
obj.forEach(item=>{
  item.new =  item.old
})
}

function handleAddSuffix(index,row) {
addPrefixSuffix (undefinedVar.value,'suffix',index,row.suffix)
}

function handleChangeSuffix(e) {
console.log(e)
if (e) {
  undefinedVar.value.forEach(item=>{
    item.new =  item.old
    item.new = item.new + e
  })
} else {
  undefinedVar.value.forEach(item=>{
    item.new =  item.old
  })
}
}

function handleChangePrefix(e) {
console.log(e)
if (e) {
  undefinedMethods.value.forEach(item=>{
    item.new =  item.old
    item.new = e + item.new
  })
} else {
  undefinedMethods.value.forEach(item=>{
    item.new =  item.old
  })
}
}

function handleAddPrefix(index,row) {
addPrefixSuffix (undefinedMethods.value,'prefix',index,row.prefix)
}

function cancelClick() {
drawer.value = false
}

function confirmClick() {
console.log(undefinedVar.value)
if (undefinedVar.value && undefinedVar.value.length) {
  undefinedVar.value.forEach(item=>{
    form.value.code = form.value.code.replaceAll(`${item.old}`,item.new)
  })
}
if (undefinedMethods.value && undefinedMethods.value.length) {
  undefinedMethods.value.forEach(item=>{
    form.value.code = form.value.code.replaceAll(`${item.old}`,item.new)
  })
}
drawer.value = false
}
</script>

<style scoped>
.editor-wrapper {
width: 100%;
height: calc(100vh - 80px);
}
</style>

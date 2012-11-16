#!/usr/bin/env node
var USE_COLOR = process.env['USE_COLOR'] === 'false' || true
  ,     DEBUG = process.env['DEBUG']     === 'false' || true


~function(){ var Thing, Association, Execution, Label, Pair, GetLocals, Juxtapose, Value, parse, Stage, Staging, run
               , log, I, ANSI, getter
   
, API = function(){
   /* Things */
   Thing = function() {
      this._id = Thing.counter++
      this.members = [] }
   Association = function(to, responsible) {
   Thing.counter = 1
      this.to = to
      this.responsible = responsible || false }
   Pair = function(key, value) {
      this.key = key
      this.value = value }
   
   getter(Thing.prototype, 'named', function() { return this.hasOwnProperty('name') })
   Thing.prototype.name = function(name) { this.name = name; return this }
   Thing.prototype._name = function(name) { this.toString = function toString(){return name}; return this }
   Thing.prototype.toString = function() { return this.named? this.name:'' }
   Thing.prototype.inspect = function() { return ANSI.brblack('❲'+this._id+'❳')+this.toString() } 
   
   // Since we're doing a associative-array implementation ...
   Thing.prototype.affix = function(key, value, responsible) {
      if (key instanceof Label && !value.named) value.name = key.text
      this.members.push(new Association(new Pair(key, value), responsible)) }
   
   Execution = function(code) {
      Thing.call(this)
      if (typeof code === 'function') {
         this.native = code
         this.native.wrapper = this }
      else {
         this.code = code
         this.stack = []
         this.locals = new Thing()._name(ANSI.brblack('locals')) } }
   Execution.prototype = new Thing()
   
   Execution.prototype.toString = function() {
      return ANSI.brmagenta(this.named? '`'+this.name+'`' : '´anon´') }
   
   Label = function(text) {
      Thing.call(this)
      this.text = text }
   Label.prototype = new Thing()
   
   Label.prototype.toString = function() { return ANSI.cyan("'"+this.text+"'") }
   
   /* Bytecode */
   GetLocals = function() {
      this.type = 'locals' }
   Juxtapose = function() {
      this.type = 'juxtapose' }
   Value = function(contents) {
      this.type = 'value'
      this.contents = contents }
   
   /* Parsing */
   parse = function(text) { var i = 0
      , character = function(c){ return text[i] === c && ++i }
      , whitespace = function(){ while (character(' ')); return true }
      , bracket = function(begin, end) { var result
         return whitespace() && character(begin) && (result = expr()) &&
                whitespace() && character(end) &&
                result }
      
      , paren = function() {
         return bracket('(', ')') }
      , scope = function() { var result
         return (result = bracket('{', '}')) && [new Value(new Execution(result))] }
      , label = function(){ whitespace(); var result = ''
           while ( text[i] && /[^(){} \n;]/.test(text[i]) )
              result = result.concat(text[i++])
           return result && [new Value(new Label(result))] }
      
      , expr = function() { var term, result = [new GetLocals()]
         while (term = paren() || scope() || label())
            result = result.concat(term).concat(new Juxtapose())
         return result }
      , program = function() { var line, result = expr()
         while ((character('\n') || character(';')) && (line = expr()))
            result = result.concat(line)
         return result }
      
      return program() }
   
   /* Execution */
   Thing.prototype.handler = new Execution(function(left, right, context) {
      for (var i = 0; i < left.members.length; i++) {
         if (left.members[i].to.key.text === right.text) { Stage.stage(context, left.members[i].to.value) } }
         return null; })
   Execution.prototype.handler = new Execution(function(left, right, context) { var instruction
      if (left.code) {
         left.stack.push(right)
         while (left.code.length > 0) { instruction = left.code.shift()
            switch (instruction.type) {
               case 'locals':
                  left.stack.push(left.locals);
               break; case 'value':
                  left.stack.push(instruction.contents);
               break; case 'juxtapose':
                  var b = left.stack.pop()
                    , a = left.stack.pop()
                  Stage.stage(a, b, left)
                  return } } } })
   
   /* Staging */
   Stage = {}
   Stage.queue = []
   
   Staging = function(stagee, value, context) {
      this.stagee = stagee
      this.value = value
      this.context = context }
   
   Stage.stage = function(stagee, value, context) {
      Stage.queue.push(new Staging(stagee, value, context)) }
   Stage.result = function(context, value) { var caller = arguments.callee.caller
      if (value instanceof Execution && arguments.callee.caller.wrapper instanceof Execution
      &&  caller.wrapper.named && !value.named)
          value.name = caller.wrapper.name + '.' // Accrue periods onto the name for each coconsumer
      Stage.stage(context, value || null) }
   
   Stage.next = function() {
      var staging = Stage.queue.shift()
      log(I(staging.stagee)+' ✦ '+I(staging.value))
      if (staging.stagee.native) {
         staging.stagee.native(staging.value, staging.context) }
      else if (staging.stagee.handler.native) {
         staging.stagee.handler.native(staging.stagee, staging.value, staging.context) } }
} // /API
      
   /* Wrap it all up */
   run = function(text) { var
      execution = new Execution(parse(text))._name(ANSI.brmagenta('root'))
      execution.locals.affix(new Label('print'), new Execution(function(label, context) {
         console.log(label.text)
         Stage.stage(context, null) }))
      execution.locals.affix(new Label('inspect'), new Execution(function(thing, context) {
         console.log(thing.inspect())
         Stage.stage(context, null) }))
      execution.locals.affix(new Label('affix'), new Execution(function(receiver, context) {
                           Stage.result(context, new Execution(function(label, context) {
                           Stage.result(context, new Execution(function(value, context) {
         receiver.affix(label, value)
         Stage.stage(context, null) })) })) }))
      execution.locals.affix(new Label('a'), new Label('b'), true)
      Stage.stage(execution, null)
      while (Stage.queue.length > 0) {
         Stage.next() } }
   
   /* elliottcable-Plumbing */
   I = function(it) { return it? ANSI.brblack('❲'+it._id+'❳')+it.toString() : ANSI.red('null')  } 
   log = function(text) { if (DEBUG)
      console.log(ANSI.SGR(40)+([].slice.call(arguments).join(', '))+' '+ANSI.SGR(49)) }
   ANSI = new Array
   ANSI[30] = 'black';   ANSI[31] = 'red';       ANSI[32] = 'green';   ANSI[33] = 'yellow'
   ANSI[34] = 'blue';    ANSI[35] = 'magenta';   ANSI[36] = 'cyan';    ANSI[37] = 'black'; ANSI[39] = 'reset'
   ANSI[90] = 'brblack'; ANSI[91] = 'brred';     ANSI[92] = 'brgreen'; ANSI[93] = 'yellow'
   ANSI[94] = 'brblue';  ANSI[95] = 'brmagenta'; ANSI[96] = 'brcyan';  ANSI[97] = 'black'; 
   ANSI.SGR = function(text){ return USE_COLOR? '\033['+text+'m' : '' }
   ANSI.forEach(function(name, code, ANSI){ ANSI[name] = function(text){
      return ANSI.SGR(code) + text + ANSI.SGR(39) } })
   
   getter = function(object, property, getter) {
      if (!object.hasOwnProperty(property))
         Object.defineProperty(object, property, { get:getter, enumerable:false }) }
   
   /* Testing */
   API()
   run(process.argv[2])
}()

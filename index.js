// parses strings, numbers and words
function parseExpression(program) {
  // remove any whitespace
  program = skipSpace(program);
  let match, expr;
  // construct different data structure depending on parsed program
  if ((match = /^"([^"]*)"/.exec(program))) {
    expr = { type: 'value', value: match[1] };
  } else if ((match = /^\d+\b/.exec(program))) {
    expr = { type: 'value', value: Number(match[0]) };
  } else if ((match = /^[^\s(),#"]+/.exec(program))) {
    expr = { type: 'word', name: match[0] };
  } else {
    // throw syntax error if the expression isn't valid
    throw new SyntaxError('Unexpected syntax:' + program);
  }
  return parseApply(expr, program.slice(match[0].length));
}
// function to cut whitespace off the start of the program string
function skipSpace(string) {
  let first = string.search(/\S/);
  if (first == -1) return '';
  return string.slice(first);
}
// checks whether the expression is an application and it parses a parenthesized list of arguments
function parseApply(expr, program) {
  program = skipSpace(program);
  // return the expression it was given if there's no opening parenthesis
  if (program[0] != '(') {
    return { expr: expr, rest: program };
  }
  // create syntax tree object
  program = skipSpace(program.slice(1));
  expr = { type: 'apply', operator: expr, args: [] };
  // recursively call parseExpression to parse each argument until a closing parenthesis is found
  while (program[0] != ')') {
    let arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);

    if (program[0] == ',') {
      program = skipSpace(program.slice(1));
    } else if (program[0] != ')') {
      throw new SyntaxError("Expected ',' or ')'");
    }
  }
  return parseApply(expr, program.slice(1));
}
// verifies that it has reached the end of the input string after parsing the expression and gives program's data structure
function parse(program) {
  let { expr, rest } = parseExpression(program);
  if (skipSpace(rest).length > 0) {
    throw new SyntaxError('Unexpected text after program');
  }
  return expr;
}
const specialForms = Object.create(null);
// evaluator
function evaluate(expr, scope) {
  // a value returns itself
  if (expr.type == 'value') {
    return expr.value;
  } else if (expr.type == 'word') {
    // check if the binding is in the scope and return value
    if (expr.name in scope) {
      return scope[expr.name];
    } else {
      throw new ReferenceError(`Undefined binding: ${expr.name}`);
    }
  } else if (expr.type == 'apply') {
    let { operator, args } = expr;
    if (operator.type == 'word' && operator.name in specialForms) {
      return specialForms[operator.name](expr.args, scope);
    } else {
      let op = evaluate(operator, scope);
      if (typeof op == 'function') {
        return op(...args.map((arg) => evaluate(arg, scope)));
      } else {
        throw new TypeError('Applying a non-function');
      }
    }
  }
}
// add "if" syntax
specialForms.if = (args, scope) => {
  if (args.length != 3) {
    throw new SyntaxError('Wrong number of args to if');
  } else if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};
// add "while" syntax
specialForms.while = (args, scope) => {
  if (args.length != 2) {
    throw new SyntaxError('Wrong number of args to while');
  }
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }
  return false;
};
// add "do" syntax
specialForms.do = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }
  return value;
};
// create bindings
specialForms.def = (args, scope) => {
  if (args.length != 2 || args[0].type != 'word') {
    throw new SyntaxError("Incorrect use of 'def'");
  }
  let value = evaluate(args[1], scope);
  scope[args[0].name] = value;
  return value;
};
// scopes
const topScope = Object.create(null);
topScope.true = true;
topScope.false = false;
// basic arithmetic and comparison operators
for (let op of ['+', '-', '*', '/', '==', '<', '>']) {
  topScope[op] = Function('a, b', `return a ${op} b;`);
}
// add "print" scope
topScope.print = (value) => {
  console.log(value);
  return value;
};
// parse a program and run it in a fresh scope
function run(program) {
  return evaluate(parse(program), Object.create(topScope));
}

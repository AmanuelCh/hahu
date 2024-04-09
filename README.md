# Hahu

Hahu is a simple programming language created using JavaScript as a learning tool for diving deep into JavaScript data structures and algorithms. It supports fetching data, arrays, functions, and conditional and looping statements.

### Features

- `Data Fetching`: Hahu supports fetching data from external sources using the `getData()` function.
- `Arrays`: Hahu supports arrays and their operations, such as `push`, `pop`, `shift`, `unshift`, and more.
- `Functions`: Hahu supports functions and their parameters.
- `Conditional Statements`: Hahu supports `if`, `while`, and `do` statements for conditional and looping operations.

### Usage

Include `index.js` and run it on terminal or browser. Explore the different methods provided

For example, to create and run a function that calculates a power
```
run(`
do(def(pow, fun(base, exp,
if(==(exp, 0),
1,
*(base, pow(base, -(exp, 1)))))),
print(pow(9, 2)))
`);
// → 81
```

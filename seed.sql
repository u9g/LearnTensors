INSERT OR IGNORE INTO problems (name, slug, description, starter_code, difficulty, correct_code, test_harness) VALUES (
  'Matrix Multiplication',
  'matrix-multiplication',
  'Write a function that takes two 2D tensors (matrices) as input and returns their matrix product.

## Example

**Input:**
```python
a = [[1, 2],
     [3, 4]]
b = [[5, 6],
     [7, 8]]
```

**Output:**
```python
[[19, 22],
 [43, 50]]
```

## Constraints
- `a` has shape `(m, n)` and `b` has shape `(n, p)`
- Return a tensor of shape `(m, p)`',
  'import torch

def matrix_multiply(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    pass',
  'Easy',
  'import torch

def matrix_multiply(a: torch.Tensor, b: torch.Tensor) -> torch.Tensor:
    return a @ b',
  'import torch
from solution import matrix_multiply
from correct_solution import matrix_multiply as correct_matrix_multiply

def test(a, b):
    a = torch.tensor(a)
    b = torch.tensor(b)
    result = matrix_multiply(a, b)
    expected = correct_matrix_multiply(a, b)
    assert torch.equal(result, expected), f"Expected: {expected.tolist()}\n     Got: {result.tolist()}"'
);

INSERT OR IGNORE INTO test_cases (id, problem_id, input, expected_output) VALUES
(1, 1, '[[1,2],[3,4]], [[5,6],[7,8]]', ''),
(2, 1, '[[1,0],[0,1]], [[7,8],[9,10]]', ''),
(3, 1, '[[2,3,4]], [[1],[2],[3]]', '');

INSERT OR IGNORE INTO problems (id, name, slug, description, starter_code, difficulty, correct_code, test_harness) VALUES (
  2,
  'Linear Layer',
  'linear-layer',
  'Implement a linear (fully connected) layer from scratch. A linear layer computes `y = x @ W^T + b` where `x` is the input, `W` is the weight matrix, and `b` is the bias vector.

## Example

**Input:**
```python
x = [[1.0, 2.0]]
weight = [[0.5, -1.0],
          [1.5,  0.5]]
bias = [0.1, -0.2]
```

**Output:**
```python
[[-1.4, 2.3]]
```

## Details
- `x` has shape `(batch_size, in_features)`
- `weight` has shape `(out_features, in_features)`
- `bias` has shape `(out_features,)`
- Return a tensor of shape `(batch_size, out_features)`
- Do **not** use `torch.nn.Linear` — implement the math yourself',
  'import torch

def linear(x: torch.Tensor, weight: torch.Tensor, bias: torch.Tensor) -> torch.Tensor:
    pass',
  'Medium',
  'import torch

def linear(x: torch.Tensor, weight: torch.Tensor, bias: torch.Tensor) -> torch.Tensor:
    return x @ weight.T + bias',
  'import torch
from solution import linear
from correct_solution import linear as correct_linear

def test(x, weight, bias):
    x = torch.tensor(x).float()
    weight = torch.tensor(weight).float()
    bias = torch.tensor(bias).float()
    result = linear(x, weight, bias)
    expected = correct_linear(x, weight, bias)
    assert torch.equal(result, expected), f"Expected: {expected.tolist()}\n     Got: {result.tolist()}"'
);

INSERT OR IGNORE INTO test_cases (id, problem_id, input, expected_output) VALUES
(4, 2, '[[1.0,2.0]], [[0.5,-1.0],[1.5,0.5]], [0.1,-0.2]', ''),
(5, 2, '[[1.0,0.0],[0.0,1.0]], [[3.0,4.0],[5.0,6.0]], [0.0,0.0]', ''),
(6, 2, '[[1.0,2.0,3.0]], [[1.0,1.0,1.0]], [1.0]', '');

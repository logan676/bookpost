import SwiftUI

struct SearchBarView: View {
    @Binding var text: String
    var placeholder: String = L10n.Common.search
    var onSearch: (() -> Void)?

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.secondary)

            TextField(placeholder, text: $text)
                .textFieldStyle(PlainTextFieldStyle())
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .onSubmit {
                    onSearch?()
                }

            if !text.isEmpty {
                Button(action: {
                    text = ""
                    onSearch?()
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(10)
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

#Preview {
    SearchBarView(text: .constant(""))
        .padding()
}
